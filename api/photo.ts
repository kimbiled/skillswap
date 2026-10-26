import { HttpError, route, sessionUserId } from './_lib/http.js'

/** Serves a review photo: anyone for published reviews, otherwise only the two sides of the exchange. */
export const GET = route(async (req, q) => {
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Некорректный запрос')
  const me = await sessionUserId(q, req)
  const [row] = await q(
    `SELECT r.photo FROM reviews r JOIN exchanges e ON e.id = r.exchange_id
     WHERE r.id = $1 AND r.photo IS NOT NULL AND (e.status = 'done' OR e.learner_id = $2 OR e.teacher_id = $2)`,
    [id, me],
  )
  const match = typeof row?.photo === 'string' ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(row.photo) : null
  if (!match) throw new HttpError(404, 'Фото не найдено')
  return new Response(Buffer.from(match[2], 'base64'), {
    headers: {
      'Content-Type': match[1],
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
