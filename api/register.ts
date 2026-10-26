import { HttpError, clientIp, createSession, hashPassword, json, logEvent, readJson, route } from './_lib/http.js'
import { LOGIN_RE, PASSWORD_MIN, TELEGRAM_RE, isPhone, normalizePhone } from '../shared/rules.js'

type Body = {
  login: unknown; password: unknown; firstName: unknown; lastName: unknown; age: unknown; university: unknown
  telegram: unknown; whatsapp: unknown; teach: unknown; learn: unknown; about?: unknown
  parentConsent?: unknown; privacyConsent?: unknown
}

const text = (v: unknown, field: string, max = 60) => {
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `Заполните поле «${field}».`)
  if (v.trim().length > max) throw new HttpError(400, `Поле «${field}» длиннее ${max} символов.`)
  return v.trim()
}

const skills = (v: unknown, field: string) => {
  if (!Array.isArray(v) || v.length < 1 || v.length > 5) throw new HttpError(400, `«${field}»: от 1 до 5 навыков.`)
  return [...new Set(v.map((s) => text(s, field, 40)))]
}

export const POST = route(async (req, q) => {
  const b = await readJson<Body>(req)

  const login = text(b.login, 'Логин', 32).toLowerCase()
  if (!LOGIN_RE.test(login)) throw new HttpError(400, 'Логин: латиница, цифры, точка и _, от 3 символов.')
  if (typeof b.password !== 'string' || b.password.length < PASSWORD_MIN || b.password.length > 200) {
    throw new HttpError(400, `Пароль — от ${PASSWORD_MIN} символов.`)
  }
  const age = Number(b.age)
  if (!Number.isInteger(age) || age < 14 || age > 35) throw new HttpError(400, 'Возраст — от 14 до 35 лет.')
  if (age < 18 && b.parentConsent !== true) throw new HttpError(400, 'До 18 лет нужно согласие родителей.')
  if (b.privacyConsent !== true) throw new HttpError(400, 'Нужно согласие на обработку персональных данных.')

  const telegram = text(b.telegram, 'Telegram', 33)
  if (!TELEGRAM_RE.test(telegram)) throw new HttpError(400, 'Ник в Telegram: латиница, цифры и _, от 5 символов.')
  const whatsapp = text(b.whatsapp, 'WhatsApp', 20)
  if (!isPhone(whatsapp)) throw new HttpError(400, 'Номер WhatsApp — например, +7 701 123 45 67.')
  const about = typeof b.about === 'string' && b.about.trim() ? b.about.trim().slice(0, 160) : null

  const rows = await q(
    `INSERT INTO users (login, password_hash, first_name, last_name, age, university, telegram, whatsapp, teach, learn, about)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      login, await hashPassword(b.password), text(b.firstName, 'Имя'), text(b.lastName, 'Фамилия'), age,
      text(b.university, 'Вуз или школа', 120), telegram.replace(/^@/, '').toLowerCase(), normalizePhone(whatsapp),
      skills(b.teach, 'Научу'), skills(b.learn, 'Хочу научиться'), about,
    ],
  )
  if (!rows[0]) {
    const [taken] = await q(`SELECT login = $1 AS login_taken FROM users WHERE login = $1 OR telegram = $2 LIMIT 1`, [
      login, telegram.replace(/^@/, '').toLowerCase(),
    ])
    throw new HttpError(409, taken?.login_taken ? 'Этот логин уже занят.' : 'Этот Telegram уже зарегистрирован. Войдите в свой аккаунт.')
  }

  await logEvent(q, { type: 'register', actorId: rows[0].id, details: { login, ip: clientIp(req) } })
  return json({ ok: true }, 201, { 'Set-Cookie': await createSession(q, rows[0].id) })
})
