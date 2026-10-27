import { iso } from './_lib/db.js'
import { isAdmin, json, route, sessionUserId } from './_lib/http.js'

/**
 * Everything the site needs in one response: ads, the viewer's exchanges and reviews.
 * Contacts are only included for the viewer and for people they share an exchange with.
 */
export const GET = route(async (req, q) => {
  const me = await sessionUserId(q, req)

  const users = await q(
    `SELECT id, login, first_name, last_name, age, university, telegram, whatsapp, teach, learn, about, ad_hidden, created_at
     FROM users ORDER BY created_at DESC LIMIT 1000`,
  )
  const exchanges = me
    ? await q(`SELECT * FROM exchanges WHERE learner_id = $1 OR teacher_id = $1`, [me])
    : []
  const counterparts = new Set(exchanges.flatMap((e) => [e.learner_id, e.teacher_id]))

  const reviews = await q(
    `SELECT r.id, r.exchange_id, r.author_id, r.target_id, r.rating, r.text, r.photo IS NOT NULL AS has_photo,
            r.created_at, e.status = 'done' AS published
     FROM reviews r JOIN exchanges e ON e.id = r.exchange_id
     WHERE e.status = 'done' OR e.learner_id = $1 OR e.teacher_id = $1`,
    [me],
  )

  return json({
    currentUserId: me,
    isAdmin: await isAdmin(q, me),
    users: users.map((u) => {
      const isMe = u.id === me
      const reveal = isMe || counterparts.has(u.id)
      return {
        id: u.id,
        login: isMe ? u.login : undefined,
        firstName: u.first_name,
        lastName: isMe ? u.last_name : u.last_name.charAt(0),
        age: u.age,
        university: u.university,
        teach: u.teach,
        learn: u.learn,
        about: u.about ?? undefined,
        hidden: u.ad_hidden || undefined,
        telegram: reveal ? u.telegram : undefined,
        whatsapp: reveal ? u.whatsapp : undefined,
        createdAt: iso(u.created_at),
      }
    }),
    exchanges: exchanges.map((e) => ({
      id: e.id,
      learnerId: e.learner_id,
      teacherId: e.teacher_id,
      status: e.status,
      skill: e.skill ?? undefined,
      date: iso(e.date),
      createdAt: iso(e.created_at),
      updatedAt: iso(e.updated_at),
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      exchangeId: r.exchange_id,
      authorId: r.author_id,
      targetId: r.target_id,
      rating: r.rating,
      text: r.text,
      hasPhoto: r.has_photo,
      published: r.published,
      createdAt: iso(r.created_at),
    })),
  })
})
