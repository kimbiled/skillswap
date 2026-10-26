import { randomBytes } from 'node:crypto'
import { iso } from './_lib/db.js'
import { HttpError, hashPassword, json, logEvent, readJson, requireAdmin, route } from './_lib/http.js'
import { ACTIVE, LESSON_PRICE, WELCOME_BONUS } from '../shared/rules.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const person = (prefix: string, r: Record<string, any>) => ({
  id: r[`${prefix}_id`],
  login: r[`${prefix}_login`],
  name: r[`${prefix}_first`] ? `${r[`${prefix}_first`]} ${r[`${prefix}_last`]}` : undefined,
  telegram: r[`${prefix}_tg`],
  whatsapp: r[`${prefix}_wa`],
})

/** Everything the admin page shows: totals, the confirmation queue, the audit log and users. */
export const GET = route(async (req, q) => {
  await requireAdmin(q, req)

  const [stats] = await q(
    `SELECT (SELECT count(*) FROM users) AS users,
            (SELECT count(*) FROM exchanges WHERE status = 'done') AS done,
            (SELECT count(*) FROM exchanges WHERE status = ANY($1)) AS active,
            (SELECT count(*) FROM exchanges WHERE status = 'disputed') AS disputed,
            (SELECT count(*) FROM exchanges WHERE status = 'confirming') AS confirming,
            (SELECT count(*) FROM events WHERE at > now() - interval '24 hours') AS events_24h`,
    [ACTIVE],
  )

  const queue = await q(
    `SELECT e.id, e.status, e.skill, e.date, e.updated_at,
            l.id AS l_id, l.login AS l_login, l.first_name AS l_first, l.last_name AS l_last, l.telegram AS l_tg, l.whatsapp AS l_wa,
            t.id AS t_id, t.login AS t_login, t.first_name AS t_first, t.last_name AS t_last, t.telegram AS t_tg, t.whatsapp AS t_wa,
            r.id AS r_id, r.rating, r.text, r.photo IS NOT NULL AS has_photo
     FROM exchanges e
     JOIN users l ON l.id = e.learner_id
     JOIN users t ON t.id = e.teacher_id
     LEFT JOIN reviews r ON r.exchange_id = e.id
     WHERE e.status IN ('disputed', 'confirming')
     ORDER BY e.status = 'disputed' DESC, e.updated_at ASC`,
  )

  const events = await q(
    `SELECT ev.id, ev.at, ev.type, ev.details, ev.exchange_id, ex.skill,
            a.id AS a_id, a.login AS a_login, a.first_name AS a_first, a.last_name AS a_last,
            tg.id AS g_id, tg.login AS g_login, tg.first_name AS g_first, tg.last_name AS g_last
     FROM events ev
     LEFT JOIN users a ON a.id = ev.actor_id
     LEFT JOIN users tg ON tg.id = ev.target_id
     LEFT JOIN exchanges ex ON ex.id = ev.exchange_id
     ORDER BY ev.at DESC, ev.id DESC
     LIMIT 500`,
  )

  const users = await q(
    `SELECT u.id, u.login, u.first_name, u.last_name, u.age, u.university, u.telegram, u.whatsapp, u.created_at, u.locked_until,
            count(e.id) FILTER (WHERE e.status = 'done' AND e.teacher_id = u.id) AS taught,
            count(e.id) FILTER (WHERE e.status = 'done' AND e.learner_id = u.id) AS learned,
            count(e.id) FILTER (WHERE e.learner_id = u.id AND e.status = ANY($1)) AS reserved
     FROM users u
     LEFT JOIN exchanges e ON e.learner_id = u.id OR e.teacher_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
    [ACTIVE],
  )

  return json({
    stats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Number(v)])),
    queue: queue.map((r) => ({
      id: r.id,
      status: r.status,
      skill: r.skill ?? undefined,
      date: iso(r.date),
      updatedAt: iso(r.updated_at),
      learner: person('l', r),
      teacher: person('t', r),
      review: r.r_id ? { id: r.r_id, rating: r.rating, text: r.text, hasPhoto: r.has_photo } : undefined,
    })),
    events: events.map((r) => ({
      id: String(r.id),
      at: iso(r.at),
      type: r.type,
      details: r.details ?? undefined,
      exchangeId: r.exchange_id ?? undefined,
      skill: r.skill ?? undefined,
      actor: r.a_id ? person('a', r) : undefined,
      target: r.g_id ? person('g', r) : undefined,
    })),
    users: users.map((u) => {
      const taught = Number(u.taught)
      const learned = Number(u.learned)
      return {
        id: u.id,
        login: u.login,
        name: `${u.first_name} ${u.last_name}`,
        age: u.age,
        university: u.university,
        telegram: u.telegram,
        whatsapp: u.whatsapp,
        createdAt: iso(u.created_at),
        locked: Boolean(u.locked_until && new Date(u.locked_until) > new Date()),
        taught,
        learned,
        balance: WELCOME_BONUS + LESSON_PRICE * (taught - learned),
        reserved: LESSON_PRICE * Number(u.reserved),
      }
    }),
  })
})

type Body = { action?: unknown; id?: unknown; decision?: unknown; note?: unknown }

export const POST = route(async (req, q) => {
  const adminId = await requireAdmin(q, req)
  const b = await readJson<Body>(req)
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 300) || undefined : undefined

  /** Removes the accounts made by scripts/seed-demo.mjs, with their lessons and reviews. */
  if (b.action === 'purge_demo') {
    const removed = await q(`DELETE FROM users WHERE login LIKE 'demo\\_%' RETURNING id`)
    await logEvent(q, { type: 'admin_purge_demo', actorId: adminId, details: { removed: removed.length } })
    return json({ ok: true, removed: removed.length })
  }

  if (typeof b.id !== 'string' || !UUID_RE.test(b.id)) throw new HttpError(400, 'Некорректный запрос')
  switch (b.action) {
    /** Settle a disputed or stuck lesson: "done" moves coins and publishes the review, "failed" cancels it. */
    case 'resolve': {
      if (b.decision !== 'done' && b.decision !== 'failed') throw new HttpError(400, 'Решение: done или failed')
      const [before] = await q(`SELECT status FROM exchanges WHERE id = $1`, [b.id])
      const [ex] = await q(
        `UPDATE exchanges SET status = $1, updated_at = now()
         WHERE id = $2 AND status IN ('disputed', 'confirming')
         RETURNING id, learner_id, teacher_id`,
        [b.decision, b.id],
      )
      if (!ex) throw new HttpError(409, 'Этот обмен уже решён. Обновите страницу.')
      await logEvent(q, {
        type: 'admin_resolve', actorId: adminId, exchangeId: ex.id, targetId: ex.teacher_id,
        details: { decision: b.decision, from: before?.status, note },
      })
      return json({ ok: true })
    }
    /** Password recovery by hand: a one-time temporary password the admin passes on to the user. */
    case 'reset_password': {
      const password = randomBytes(9).toString('base64url')
      const [user] = await q(
        `UPDATE users SET password_hash = $1, failed_logins = 0, locked_until = NULL WHERE id = $2 RETURNING id, login`,
        [await hashPassword(password), b.id],
      )
      if (!user) throw new HttpError(404, 'Пользователь не найден')
      await q(`DELETE FROM sessions WHERE user_id = $1`, [user.id])
      await logEvent(q, { type: 'admin_reset_password', actorId: adminId, targetId: user.id, details: { note } })
      return json({ ok: true, login: user.login, password })
    }
    default:
      throw new HttpError(400, 'Неизвестное действие')
  }
})
