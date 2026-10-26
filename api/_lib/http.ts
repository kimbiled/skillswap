import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { db, type Query } from './db.js'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })

type Handler = (req: Request, q: Query) => Promise<Response>

/** Opens the database, turns HttpError into a JSON error and hides unexpected ones behind a 500. */
export function route(handler: Handler) {
  return async (req: Request) => {
    try {
      if (req.method !== 'GET') assertSameOrigin(req)
      return await handler(req, await db())
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status)
      console.error(err)
      return json({ error: 'Что-то пошло не так на сервере. Попробуйте ещё раз.' }, 500)
    }
  }
}

// Cookies are SameSite=Lax; on top of that, writes must come from our own pages.
function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== req.headers.get('host')) throw new HttpError(403, 'Запрос с другого сайта')
}

export async function readJson<T>(req: Request, maxBytes = 1_500_000): Promise<T> {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Ожидается JSON')
  const text = await req.text()
  if (text.length > maxBytes) throw new HttpError(413, 'Слишком большой запрос. Попробуйте фото поменьше.')
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError(400, 'Некорректный запрос')
  }
}

/* ---------- passwords ---------- */

const scryptAsync = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))))

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('base64')}$${(await scryptAsync(password, salt)).toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, salt, hash] = stored.split('$')
  if (alg !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/* ---------- sessions ---------- */

const COOKIE = 'ssk_session'
const TTL_SECONDS = 30 * 24 * 60 * 60
// Only a hash of the token is stored, so a leaked sessions table can't be replayed.
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const cookie = (value: string, maxAge: number) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.VERCEL ? '; Secure' : ''}`

function readToken(req: Request) {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE) return rest.join('=') || null
  }
  return null
}

/** Creates a session and returns the Set-Cookie header value. */
export async function createSession(q: Query, userId: string) {
  const token = randomBytes(32).toString('base64url')
  await q(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))`, [
    hashToken(token), userId, TTL_SECONDS,
  ])
  return cookie(token, TTL_SECONDS)
}

export async function destroySession(q: Query, req: Request) {
  const token = readToken(req)
  if (token) await q(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)])
  return cookie('', 0)
}

export async function sessionUserId(q: Query, req: Request): Promise<string | null> {
  const token = readToken(req)
  if (!token) return null
  const rows = await q(`SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()`, [hashToken(token)])
  return rows[0]?.user_id ?? null
}

export async function requireUser(q: Query, req: Request) {
  const id = await sessionUserId(q, req)
  if (!id) throw new HttpError(401, 'Войдите в аккаунт')
  return id
}
