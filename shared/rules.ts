// Business rules shared by the site (src/) and the API (api/), so both enforce the same numbers.

/** Launch pricing: every lesson costs the learner 10 SC and pays the teacher 10 SC. */
export const LESSON_PRICE = 10
/** Given at registration so a newcomer can take a first lesson before teaching one. */
export const WELCOME_BONUS = 10

/**
 * opened     — contacts revealed, waiting for "связались" / "не вышло"
 * contacted  — they talked, no date yet (learner's coins are reserved from here)
 * scheduled  — date agreed
 * met        — they met, waiting for the learner's review
 * confirming — learner left a review, waiting for the ad owner to confirm
 * done       — owner confirmed: coins moved, review published
 * failed     — nothing came of it, reservation released
 * disputed   — owner says the lesson didn't happen; goes to moderation
 */
export type ExchangeStatus = 'opened' | 'contacted' | 'scheduled' | 'met' | 'confirming' | 'done' | 'failed' | 'disputed'
export const ACTIVE: ExchangeStatus[] = ['contacted', 'scheduled', 'met', 'confirming']

export const LOGIN_RE = /^[a-z0-9_.]{3,32}$/
export const TELEGRAM_RE = /^@?[A-Za-z0-9_]{5,32}$/
export const PASSWORD_MIN = 8

/** Keeps digits only and turns a local "8 701…" into "7701…", the form wa.me expects. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits
}
export const isPhone = (raw: string) => /^\d{10,15}$/.test(normalizePhone(raw))
