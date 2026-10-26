import { HttpError, createSession, destroySession, hashPassword, json, readJson, route, verifyPassword } from './_lib/http.js'

const MAX_FAILED = 10

/** Log in with login + password. */
export const POST = route(async (req, q) => {
  const { login, password } = await readJson<{ login?: unknown; password?: unknown }>(req)
  const wrong = new HttpError(401, 'Неверный логин или пароль.')
  if (typeof login !== 'string' || typeof password !== 'string') throw wrong

  const [user] = await q(`SELECT id, password_hash, locked_until FROM users WHERE login = $1`, [login.trim().toLowerCase()])
  if (!user) {
    await hashPassword(password) // same work as a real check, so timing doesn't reveal which logins exist
    throw wrong
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(429, 'Слишком много неудачных попыток. Попробуйте через 15 минут.')
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    // An expired lock starts the count over; the 10th miss in a row locks for 15 minutes.
    await q(
      `UPDATE users SET
         failed_logins = CASE WHEN locked_until < now() THEN 1 ELSE failed_logins + 1 END,
         locked_until = CASE WHEN (CASE WHEN locked_until < now() THEN 1 ELSE failed_logins + 1 END) >= $2
                             THEN now() + interval '15 minutes' ELSE NULL END
       WHERE id = $1`,
      [user.id, MAX_FAILED],
    )
    throw wrong
  }
  await q(`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1`, [user.id])
  return json({ ok: true }, 200, { 'Set-Cookie': await createSession(q, user.id) })
})

/** Log out. */
export const DELETE = route(async (req, q) => json({ ok: true }, 200, { 'Set-Cookie': await destroySession(q, req) }))
