import { HttpError, clientIp, createSession, hashPassword, json, logEvent, readJson, route } from './_lib/http.js'
import { parseProfile, text } from './_lib/validate.js'
import { LOGIN_RE, PASSWORD_MIN } from '../shared/rules.js'

export const POST = route(async (req, q) => {
  const b = await readJson<Record<string, unknown>>(req)

  const login = text(b.login, 'Логин', 32).toLowerCase()
  if (!LOGIN_RE.test(login)) throw new HttpError(400, 'Логин: латиница, цифры, точка и _, от 3 символов.')
  if (typeof b.password !== 'string' || b.password.length < PASSWORD_MIN || b.password.length > 200) {
    throw new HttpError(400, `Пароль — от ${PASSWORD_MIN} символов.`)
  }
  if (b.privacyConsent !== true) throw new HttpError(400, 'Нужно согласие на обработку персональных данных.')
  const p = parseProfile(b)

  const rows = await q(
    `INSERT INTO users (login, password_hash, first_name, last_name, age, university, telegram, whatsapp, teach, learn, about)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [login, await hashPassword(b.password), p.firstName, p.lastName, p.age, p.university, p.telegram, p.whatsapp, p.teach, p.learn, p.about],
  )
  if (!rows[0]) {
    const [taken] = await q(`SELECT login = $1 AS login_taken FROM users WHERE login = $1 OR telegram = $2 LIMIT 1`, [login, p.telegram])
    throw new HttpError(409, taken?.login_taken ? 'Этот логин уже занят.' : 'Этот Telegram уже зарегистрирован. Войдите в свой аккаунт.')
  }

  await logEvent(q, { type: 'register', actorId: rows[0].id, details: { login, ip: clientIp(req) } })
  return json({ ok: true }, 201, { 'Set-Cookie': await createSession(q, rows[0].id) })
})
