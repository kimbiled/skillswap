import { HttpError, clientIp, createSession, hashPassword, json, logEvent, readJson, requireUser, route, verifyPassword } from './_lib/http.js'
import { parseProfile, type Profile } from './_lib/validate.js'
import { PASSWORD_MIN } from '../shared/rules.js'

const COLUMNS: Record<keyof Profile, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  age: 'age',
  university: 'university',
  telegram: 'telegram',
  whatsapp: 'whatsapp',
  teach: 'teach',
  learn: 'learn',
  about: 'about',
}

/** Edit your own ad and contacts, take the ad off the board, or change your password. The login itself can't be changed. */
export const POST = route(async (req, q) => {
  const me = await requireUser(q, req)
  const b = await readJson<Record<string, unknown>>(req)

  if (b.action === 'update') {
    const p = parseProfile(b)
    const [before] = await q(`SELECT ${Object.values(COLUMNS).join(', ')} FROM users WHERE id = $1`, [me])
    const rows = await q(
      `UPDATE users SET first_name = $2, last_name = $3, age = $4, university = $5, telegram = $6, whatsapp = $7,
                        teach = $8, learn = $9, about = $10
       WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE telegram = $6 AND id <> $1)
       RETURNING id`,
      [me, p.firstName, p.lastName, p.age, p.university, p.telegram, p.whatsapp, p.teach, p.learn, p.about],
    )
    if (!rows[0]) throw new HttpError(409, 'Этот Telegram уже указан у другого участника.')

    const changed = (Object.keys(COLUMNS) as (keyof Profile)[]).filter(
      (k) => JSON.stringify(before?.[COLUMNS[k]] ?? null) !== JSON.stringify(p[k]),
    )
    if (changed.length) await logEvent(q, { type: 'profile_update', actorId: me, details: { changed } })
    return json({ ok: true })
  }

  if (b.action === 'hide' || b.action === 'show') {
    const hidden = b.action === 'hide'
    const rows = await q(`UPDATE users SET ad_hidden = $2 WHERE id = $1 AND ad_hidden <> $2 RETURNING id`, [me, hidden])
    if (rows[0]) await logEvent(q, { type: hidden ? 'ad_hide' : 'ad_show', actorId: me })
    return json({ ok: true })
  }

  if (b.action === 'password') {
    const { current, next } = b
    if (typeof current !== 'string' || typeof next !== 'string') throw new HttpError(400, 'Некорректный запрос')
    if (next.length < PASSWORD_MIN || next.length > 200) throw new HttpError(400, `Новый пароль — от ${PASSWORD_MIN} символов.`)
    const [user] = await q(`SELECT password_hash FROM users WHERE id = $1`, [me])
    if (!user || !(await verifyPassword(current, user.password_hash))) throw new HttpError(400, 'Текущий пароль указан неверно.')
    await q(`UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL WHERE id = $1`, [me, await hashPassword(next)])
    // Sign out every other device, then give this one a fresh session.
    await q(`DELETE FROM sessions WHERE user_id = $1`, [me])
    await logEvent(q, { type: 'password_change', actorId: me, details: { ip: clientIp(req) } })
    return json({ ok: true }, 200, { 'Set-Cookie': await createSession(q, me) })
  }

  throw new HttpError(400, 'Неизвестное действие')
})
