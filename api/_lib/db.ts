// Files under api/_lib are shared helpers; Vercel doesn't turn underscore paths into endpoints.
import { neon } from '@neondatabase/serverless'

export type Row = Record<string, any>
export type Query = (text: string, params?: unknown[]) => Promise<Row[]>

declare global {
  // Set by the Vite dev server (vite.config.ts) to an in-process PGlite database.
  var __SSK_DEV_QUERY__: Query | undefined
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    login text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    age int NOT NULL CHECK (age BETWEEN 14 AND 35),
    university text NOT NULL,
    telegram text NOT NULL UNIQUE,
    whatsapp text NOT NULL,
    teach text[] NOT NULL,
    learn text[] NOT NULL,
    about text,
    failed_logins int NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS exchanges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status text NOT NULL,
    date timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (learner_id, teacher_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id uuid NOT NULL UNIQUE REFERENCES exchanges(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text text NOT NULL,
    photo text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  // Audit log for the admin page. Passwords are never written here.
  `CREATE TABLE IF NOT EXISTS events (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    type text NOT NULL,
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    exchange_id uuid REFERENCES exchanges(id) ON DELETE SET NULL,
    target_id uuid REFERENCES users(id) ON DELETE SET NULL,
    details jsonb
  )`,
  `CREATE INDEX IF NOT EXISTS events_at_idx ON events (at DESC)`,
  // Which of the teacher's skills the lesson is about; drives learning progress per skill.
  `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS skill text`,
  `CREATE INDEX IF NOT EXISTS exchanges_learner_idx ON exchanges (learner_id)`,
  `CREATE INDEX IF NOT EXISTS exchanges_teacher_idx ON exchanges (teacher_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  // The owner took their ad off the board; the account, coins and exchanges stay.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_hidden boolean NOT NULL DEFAULT false`,
]

let ready: Promise<Query> | undefined

/** Returns a query function, creating the tables on the first call of each instance. */
export function db(): Promise<Query> {
  ready ??= (async () => {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
    let query: Query
    if (url) {
      const sql = neon(url)
      query = (text, params = []) => sql.query(text, params) as Promise<Row[]>
    } else if (globalThis.__SSK_DEV_QUERY__) {
      query = globalThis.__SSK_DEV_QUERY__
    } else {
      throw new Error('DATABASE_URL is not set. Connect a Neon Postgres database in Vercel → Storage.')
    }
    for (const statement of SCHEMA) await query(statement)
    return query
  })()
  // Let a failed start (e.g. a cold database) retry on the next request instead of caching the error.
  ready.catch(() => { ready = undefined })
  return ready
}

export const iso = (v: unknown) => (v == null ? undefined : new Date(v as string).toISOString())
