import { useSyncExternalStore } from 'react'
import { ACTIVE, LESSON_PRICE, WELCOME_BONUS, type ExchangeStatus } from '../../shared/rules'

export { ACTIVE, LESSON_PRICE, WELCOME_BONUS }
export type { ExchangeStatus }

/*
 * Client-side mirror of the server state (/api/state). Actions call the API and then
 * re-fetch, so the server stays the single source of truth for coins and statuses.
 */

export type User = {
  id: string
  login?: string // only for the signed-in user
  firstName: string
  lastName: string // initial only for other people
  age: number
  university: string
  teach: string[]
  learn: string[]
  about?: string
  telegram?: string // only for yourself and people you share an exchange with
  whatsapp?: string
  createdAt: string
}

export type Exchange = {
  id: string
  learnerId: string
  teacherId: string
  status: ExchangeStatus
  skill?: string
  date?: string
  createdAt: string
  updatedAt: string
}

export type Review = {
  id: string
  exchangeId: string
  authorId: string
  targetId: string
  rating: number
  text: string
  hasPhoto: boolean
  published: boolean // false until the ad owner confirms the lesson
  createdAt: string
}

type DB = {
  loaded: boolean
  error?: string
  users: User[]
  exchanges: Exchange[]
  reviews: Review[]
  currentUserId: string | null
  isAdmin?: boolean // only decides whether to show the link; the API checks admin rights itself
}

let db: DB = { loaded: false, users: [], exchanges: [], reviews: [], currentUserId: null }
const listeners = new Set<() => void>()

function set(next: DB) {
  db = next
  listeners.forEach((l) => l())
}

export function useDB(): DB {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => db,
  )
}

export async function api<T = { ok: true }>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body ? 'POST' : 'GET'),
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new Error('Нет связи с сервером. Проверьте интернет.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Ошибка сервера (${res.status})`)
  return data as T
}

export async function refresh() {
  try {
    const state = await api<Omit<DB, 'loaded' | 'error'>>('/api/state')
    set({ ...state, loaded: true })
  } catch (err) {
    set({ ...db, loaded: true, error: (err as Error).message })
  }
}
void refresh()

/** Runs a write, then pulls fresh state even if the write failed (it may be stale). */
async function mutate(path: string, body: unknown, method?: string) {
  try {
    await api(path, { body, method })
  } finally {
    await refresh()
  }
}

/* ---------- selectors ---------- */

export const currentUser = (d: DB) => d.users.find((u) => u.id === d.currentUserId) ?? null
export const userById = (d: DB, id: string) => d.users.find((u) => u.id === id)
export const reviewsFor = (d: DB, userId: string) => d.reviews.filter((r) => r.targetId === userId && r.published)
export const ratingOf = (d: DB, userId: string) => {
  const list = reviewsFor(d, userId)
  return list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
}
export const exchangeWith = (d: DB, learnerId: string, teacherId: string) =>
  d.exchanges.find((e) => e.learnerId === learnerId && e.teacherId === teacherId)
export const photoUrl = (r: Review) => `/api/photo?id=${r.id}`

export const balanceOf = (d: DB, userId: string) => {
  const done = d.exchanges.filter((e) => e.status === 'done')
  const taught = done.filter((e) => e.teacherId === userId).length
  const learned = done.filter((e) => e.learnerId === userId).length
  return WELCOME_BONUS + LESSON_PRICE * (taught - learned)
}
export const reservedOf = (d: DB, userId: string) =>
  LESSON_PRICE * d.exchanges.filter((e) => e.learnerId === userId && ACTIVE.includes(e.status)).length
export const availableOf = (d: DB, userId: string) => balanceOf(d, userId) - reservedOf(d, userId)

const norm = (s: string) => s.toLowerCase().trim()

/** The teacher's skill this learner most likely came for: first match with their wishes. */
export const matchedSkill = (teacher: User, learner: User | null) =>
  teacher.teach.find((t) => learner?.learn.some((l) => norm(l) === norm(t))) ?? teacher.teach[0]

/**
 * Ads that teach what the user wants. Mutual matches (they also want what the user
 * teaches) come first, then higher-rated and better-reviewed people.
 */
export function recommendationsFor(d: DB, me: User, limit = 3) {
  const wanted = new Set(me.learn.map(norm))
  const offered = new Set(me.teach.map(norm))
  return d.users
    .filter((u) => u.id !== me.id && !exchangeWith(d, me.id, u.id) && u.teach.some((t) => wanted.has(norm(t))))
    .map((u) => {
      const mutual = u.learn.some((l) => offered.has(norm(l)))
      const score = (mutual ? 100 : 0) + ratingOf(d, u.id) * 10 + reviewsFor(d, u.id).length
      return { user: u, mutual, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Lessons per skill: everything the user wants to learn plus anything they already took. */
export function learningProgress(d: DB, me: User) {
  const mine = d.exchanges.filter((e) => e.learnerId === me.id && e.skill)
  const skills = [...new Set([...me.learn, ...mine.map((e) => e.skill!)])]
  return skills.map((skill) => ({
    skill,
    done: mine.filter((e) => e.skill === skill && e.status === 'done').length,
    inProgress: mine.filter((e) => e.skill === skill && ACTIVE.includes(e.status)).length,
  }))
}

/* ---------- actions ---------- */

export type RegisterInput = {
  login: string
  password: string
  firstName: string
  lastName: string
  age: number
  university: string
  telegram: string
  whatsapp: string
  teach: string[]
  learn: string[]
  about?: string
  parentConsent?: boolean
  privacyConsent: boolean
}

export const register = (input: RegisterInput) => mutate('/api/register', input)
export const login = (loginName: string, password: string) => mutate('/api/session', { login: loginName, password })
export const logout = () => mutate('/api/session', {}, 'DELETE')

const exchange = (action: string, payload: Record<string, unknown>) => mutate('/api/exchange', { action, ...payload })

export const openContact = (teacherId: string, skill?: string) => exchange('open', { teacherId, skill })
export const markContacted = (id: string) => exchange('contacted', { id })
export const markFailed = (id: string) => exchange('failed', { id })
export const scheduleExchange = (id: string, date: string) => exchange('schedule', { id, date })
export const markMet = (id: string) => exchange('met', { id })
export const submitLesson = (id: string, review: { rating: number; text: string; photo?: string }) =>
  exchange('submit', { id, review })
export const confirmLesson = (id: string) => exchange('confirm', { id })
export const disputeLesson = (id: string) => exchange('dispute', { id })
