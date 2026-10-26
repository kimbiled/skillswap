import {
  HttpError, clientIp, createSession, destroySession, hashPassword, json, logEvent, readJson, route, sessionUserId, verifyPassword,
} from './_lib/http.js'

const MAX_FAILED = 10

/** Log in with login + password. */
export const POST = route(async (req, q) => {
  const { login, password } = await readJson<{ login?: unknown; password?: unknown }>(req)
  const wrong = new HttpError(401, 'Неверный логин или пароль.')
  if (typeof login !== 'string' || typeof password !== 'string') throw wrong
  const ip = clientIp(req)
  const attempted = login.trim().toLowerCase().slice(0, 64)

  const [user] = await q(`SELECT id, password_hash, locked_until FROM users WHERE login = $1`, [attempted])
  if (!user) {
    await hashPassword(password) // same work as a real check, so timing doesn't reveal which logins exist
    await logEvent(q, { type: 'login_failed', details: { login: attempted, ip, reason: 'unknown_login' } })
    throw wrong
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await logEvent(q, { type: 'login_locked', actorId: user.id, details: { ip } })
    throw new HttpError(429, 'Слишком много неудачных попыток. Попробуйте через 15 минут.')
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    // An expired lock starts the count over; the 10th miss in a row locks for 15 minutes.
    const [after] = await q(
      `UPDATE users SET
         failed_logins = CASE WHEN locked_until < now() THEN 1 ELSE failed_logins + 1 END,
         locked_until = CASE WHEN (CASE WHEN locked_until < now() THEN 1 ELSE failed_logins + 1 END) >= $2
                             THEN now() + interval '15 minutes' ELSE NULL END
       WHERE id = $1
       RETURNING failed_logins, locked_until`,
      [user.id, MAX_FAILED],
    )
    await logEvent(q, {
      type: after?.locked_until ? 'login_locked' : 'login_failed',
      actorId: user.id,
      details: { ip, attempt: after?.failed_logins },
    })
    throw wrong
  }
  await q(`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1`, [user.id])
  await logEvent(q, { type: 'login', actorId: user.id, details: { ip } })
  return json({ ok: true }, 200, { 'Set-Cookie': await createSession(q, user.id) })
})

/** Log out. */
export const DELETE = route(async (req, q) => {
  const userId = await sessionUserId(q, req)
  if (userId) await logEvent(q, { type: 'logout', actorId: userId })
  return json({ ok: true }, 200, { 'Set-Cookie': await destroySession(q, req) })
})
