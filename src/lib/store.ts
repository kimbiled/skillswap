import { useSyncExternalStore } from 'react'

/*
 * Prototype data layer. Everything lives in this browser's localStorage, so other
 * people never see your ad or reviews. Every screen goes through the actions below,
 * which makes this the only file to swap for a real backend (Supabase, own API…).
 */

export type User = {
  id: string
  firstName: string
  lastName: string
  age: number
  university: string
  telegram: string // stored without "@"
  teach: string[]
  learn: string[]
  about?: string
  demo?: boolean
  createdAt: string
}

/**
 * opened    — Telegram revealed, waiting for "связались" / "не вышло"
 * contacted — they talked, no date yet
 * scheduled — date agreed
 * met       — they met, waiting for feedback
 * done      — lesson confirmed with a review
 * failed    — nothing came of it
 */
export type ExchangeStatus = 'opened' | 'contacted' | 'scheduled' | 'met' | 'done' | 'failed'

export type Exchange = {
  id: string
  learnerId: string // the user who opened the ad
  teacherId: string // the ad owner
  status: ExchangeStatus
  date?: string // ISO, when status ≥ scheduled
  createdAt: string
  updatedAt: string
}

export type Review = {
  id: string
  exchangeId?: string
  authorId: string
  targetId: string
  rating: number
  text: string
  photo?: string // downscaled data URL: photo from the lesson or a chat screenshot
  createdAt: string
}

type DB = {
  version: 1
  users: User[]
  exchanges: Exchange[]
  reviews: Review[]
  currentUserId: string | null
}

const KEY = 'skillswap-kz:v1'

const now = () => new Date().toISOString()
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

// Demo ads so the board isn't empty. Handles are deliberately not real accounts.
function seed(): DB {
  const demo = (u: Omit<User, 'demo' | 'createdAt'>): User => ({ ...u, demo: true, createdAt: '2026-10-01T09:00:00.000Z' })
  const users = [
    demo({ id: 'd-madina', firstName: 'Мадина', lastName: 'Ахметова', age: 20, university: 'ЕНУ им. Гумилёва', telegram: 'demo_madina', teach: ['Figma', 'Портфолио'], learn: ['Python'], about: 'Макеты, автолейаут, разбор портфолио.' }),
    demo({ id: 'd-aruzhan', firstName: 'Аружан', lastName: 'Сейткали', age: 17, university: 'НИШ, 11 класс', telegram: 'demo_aruzhan', teach: ['Математика (ЕНТ)'], learn: ['Монтаж видео'], about: 'Профильная математика, разбор вариантов ЕНТ.' }),
    demo({ id: 'd-nurlan', firstName: 'Нурлан', lastName: 'Жумабеков', age: 22, university: 'Казахский национальный университет искусств', telegram: 'demo_nurlan', teach: ['Домбыра'], learn: ['Excel'], about: 'Учу с нуля, инструмент дам на первое занятие.' }),
    demo({ id: 'd-daniyar', firstName: 'Данияр', lastName: 'Касымов', age: 21, university: 'КазГЮУ', telegram: 'demo_daniyar', teach: ['Английский'], learn: ['Гитара'], about: 'IELTS 7.5, разговорная практика час в неделю.' }),
    demo({ id: 'd-timur', firstName: 'Тимур', lastName: 'Оспанов', age: 19, university: 'Astana IT University', telegram: 'demo_timur', teach: ['Python', 'Excel'], learn: ['Публичные выступления'], about: 'Основы Python, формулы и сводные таблицы.' }),
    demo({ id: 'd-aigerim', firstName: 'Айгерим', lastName: 'Нурланова', age: 20, university: 'Назарбаев Университет', telegram: 'demo_aigerim', teach: ['Публичные выступления', 'Казахский язык'], learn: ['Фотография'], about: 'Готовлю к выступлениям и защите проектов.' }),
  ]
  const review = (targetId: string, authorId: string, rating: number, text: string): Review => ({
    id: uid(), authorId, targetId, rating, text, createdAt: '2026-10-15T12:00:00.000Z',
  })
  return {
    version: 1,
    users,
    exchanges: [],
    reviews: [
      review('d-madina', 'd-timur', 5, 'За час разобрали автолейаут, теперь собираю макеты сам.'),
      review('d-madina', 'd-aigerim', 4, 'Понятно объясняет, дала полезные советы по портфолио.'),
      review('d-daniyar', 'd-nurlan', 5, 'Отличная разговорная практика, без стеснения.'),
      review('d-timur', 'd-madina', 5, 'Первый скрипт на Python заработал прямо на занятии.'),
    ],
    currentUserId: null,
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed.version === 1) return parsed
    }
  } catch (err) {
    console.warn('SkillSwap: stored data unreadable, starting fresh', err)
  }
  return seed()
}

let db: DB = load()
const listeners = new Set<() => void>()

export class StorageFullError extends Error {}

function commit(next: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (err) {
    // Usually a full quota from too many photos. Keep the old state so UI and storage agree.
    throw new StorageFullError(`Не удалось сохранить данные в браузере: ${(err as Error).message}`)
  }
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

/* ---------- selectors ---------- */

export const currentUser = (d: DB) => d.users.find((u) => u.id === d.currentUserId) ?? null
export const userById = (d: DB, id: string) => d.users.find((u) => u.id === id)
export const reviewsFor = (d: DB, userId: string) => d.reviews.filter((r) => r.targetId === userId)
export const ratingOf = (d: DB, userId: string) => {
  const list = reviewsFor(d, userId)
  return list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
}
export const exchangeWith = (d: DB, learnerId: string, teacherId: string) =>
  d.exchanges.find((e) => e.learnerId === learnerId && e.teacherId === teacherId)
export const ACTIVE: ExchangeStatus[] = ['contacted', 'scheduled', 'met']

/* ---------- actions ---------- */

export type RegisterInput = Omit<User, 'id' | 'createdAt' | 'demo'>

export function register(input: RegisterInput): User {
  const user: User = { ...input, telegram: input.telegram.replace(/^@/, ''), id: uid(), createdAt: now() }
  commit({ ...db, users: [...db.users, user], currentUserId: user.id })
  return user
}

export function logout() {
  commit({ ...db, currentUserId: null })
}

/** Reveal the ad owner's Telegram. Creates the exchange the first time. */
export function openContact(teacherId: string) {
  const me = db.currentUserId
  if (!me) throw new Error('Нужно зарегистрироваться')
  if (exchangeWith(db, me, teacherId)) return
  const t = now()
  const ex: Exchange = { id: uid(), learnerId: me, teacherId, status: 'opened', createdAt: t, updatedAt: t }
  commit({ ...db, exchanges: [...db.exchanges, ex] })
}

function patchExchange(id: string, patch: Partial<Exchange>) {
  commit({
    ...db,
    exchanges: db.exchanges.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)),
  })
}

export const markContacted = (id: string) => patchExchange(id, { status: 'contacted' })
export const markFailed = (id: string) => patchExchange(id, { status: 'failed' })
export const scheduleExchange = (id: string, dateISO: string) => patchExchange(id, { status: 'scheduled', date: dateISO })
export const markMet = (id: string) => patchExchange(id, { status: 'met' })

/** Lesson happened: close the exchange and attach the learner's review to the teacher. */
export function completeExchange(id: string, review: { rating: number; text: string; photo?: string }) {
  const ex = db.exchanges.find((e) => e.id === id)
  if (!ex) throw new Error('Обмен не найден')
  const t = now()
  commit({
    ...db,
    exchanges: db.exchanges.map((e) => (e.id === id ? { ...e, status: 'done', updatedAt: t } : e)),
    reviews: [...db.reviews, { id: uid(), exchangeId: id, authorId: ex.learnerId, targetId: ex.teacherId, createdAt: t, ...review }],
  })
}

export function resetDemo() {
  commit(seed())
}
