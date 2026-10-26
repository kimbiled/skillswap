import type { Query } from './_lib/db.js'
import { HttpError, json, readJson, requireUser, route } from './_lib/http.js'
import { ACTIVE, LESSON_PRICE, WELCOME_BONUS, type ExchangeStatus } from '../shared/rules.js'

type Body = {
  action?: unknown
  id?: unknown
  teacherId?: unknown
  skill?: unknown
  date?: unknown
  review?: { rating?: unknown; text?: unknown; photo?: unknown }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const NOT_ENOUGH = `Для урока нужно ${LESSON_PRICE} SC. Проведите занятие, чтобы заработать баллы.`
const UNAVAILABLE = new HttpError(409, 'Это действие сейчас недоступно. Обновите страницу.')

const uuid = (v: unknown) => {
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new HttpError(400, 'Некорректный запрос')
  return v
}

/** Same formula as the site: bonus + taught − learned − reserved for lessons in progress. */
async function available(q: Query, userId: string) {
  const [c] = await q(
    `SELECT count(*) FILTER (WHERE status = 'done' AND teacher_id = $1) AS taught,
            count(*) FILTER (WHERE status = 'done' AND learner_id = $1) AS learned,
            count(*) FILTER (WHERE learner_id = $1 AND status = ANY($2)) AS reserved
     FROM exchanges WHERE learner_id = $1 OR teacher_id = $1`,
    [userId, ACTIVE],
  )
  return WELCOME_BONUS + LESSON_PRICE * (Number(c.taught) - Number(c.learned) - Number(c.reserved))
}

/** Moves an exchange forward only from the expected status and only for the right side. */
async function transition(q: Query, id: string, me: string, role: 'learner' | 'teacher', from: ExchangeStatus[], to: ExchangeStatus, date?: string) {
  const rows = await q(
    `UPDATE exchanges SET status = $1, date = COALESCE($2::timestamptz, date), updated_at = now()
     WHERE id = $3 AND ${role}_id = $4 AND status = ANY($5)
     RETURNING id`,
    [to, date ?? null, id, me, from],
  )
  if (!rows[0]) throw UNAVAILABLE
}

export const POST = route(async (req, q) => {
  const me = await requireUser(q, req)
  const b = await readJson<Body>(req)

  switch (b.action) {
    case 'open': {
      const teacherId = uuid(b.teacherId)
      if (teacherId === me) throw new HttpError(400, 'Это ваше объявление')
      if ((await available(q, me)) < LESSON_PRICE) throw new HttpError(402, NOT_ENOUGH)
      const [teacher] = await q(`SELECT teach FROM users WHERE id = $1`, [teacherId])
      if (!teacher) throw new HttpError(404, 'Объявление не найдено')
      const skill = typeof b.skill === 'string' && teacher.teach.includes(b.skill) ? b.skill : teacher.teach[0]
      await q(
        `INSERT INTO exchanges (learner_id, teacher_id, status, skill) VALUES ($1, $2, 'opened', $3)
         ON CONFLICT (learner_id, teacher_id) DO NOTHING`,
        [me, teacherId, skill],
      )
      break
    }
    case 'contacted': {
      // Agreeing to a lesson reserves its price, so re-check in case several contacts were opened.
      if ((await available(q, me)) < LESSON_PRICE) throw new HttpError(402, NOT_ENOUGH)
      await transition(q, uuid(b.id), me, 'learner', ['opened'], 'contacted')
      break
    }
    case 'failed':
      await transition(q, uuid(b.id), me, 'learner', ['opened', 'contacted', 'scheduled', 'met'], 'failed')
      break
    case 'schedule': {
      const date = typeof b.date === 'string' ? new Date(b.date) : null
      if (!date || Number.isNaN(date.getTime())) throw new HttpError(400, 'Укажите дату встречи')
      await transition(q, uuid(b.id), me, 'learner', ['contacted', 'scheduled'], 'scheduled', date.toISOString())
      break
    }
    case 'met':
      await transition(q, uuid(b.id), me, 'learner', ['scheduled'], 'met')
      break
    case 'submit': {
      const rating = Number(b.review?.rating)
      const text = typeof b.review?.text === 'string' ? b.review.text.trim() : ''
      const photo = b.review?.photo
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Поставьте оценку от 1 до 5')
      if (text.length < 10 || text.length > 400) throw new HttpError(400, 'Отзыв — от 10 до 400 символов')
      if (photo != null && (typeof photo !== 'string' || !PHOTO_RE.test(photo) || photo.length > 1_000_000)) {
        throw new HttpError(400, 'Фото не подошло: нужна картинка JPEG, PNG или WebP до 700 КБ')
      }
      // One statement, so the review and the status change can't get out of step.
      const rows = await q(
        `WITH ex AS (
           UPDATE exchanges SET status = 'confirming', updated_at = now()
           WHERE id = $1 AND learner_id = $2 AND status = 'met'
           RETURNING id, learner_id, teacher_id
         )
         INSERT INTO reviews (exchange_id, author_id, target_id, rating, text, photo)
         SELECT id, learner_id, teacher_id, $3, $4, $5 FROM ex
         RETURNING id`,
        [uuid(b.id), me, rating, text, photo ?? null],
      )
      if (!rows[0]) throw UNAVAILABLE
      break
    }
    case 'confirm':
      await transition(q, uuid(b.id), me, 'teacher', ['confirming'], 'done')
      break
    case 'dispute':
      await transition(q, uuid(b.id), me, 'teacher', ['confirming'], 'disputed')
      break
    default:
      throw new HttpError(400, 'Неизвестное действие')
  }
  return json({ ok: true })
})
