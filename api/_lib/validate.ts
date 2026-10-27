import { HttpError } from './http.js'
import { TELEGRAM_RE, isPhone, normalizePhone } from '../../shared/rules.js'

/** Required, trimmed string no longer than `max`. */
export const text = (v: unknown, field: string, max = 60) => {
  if (typeof v !== 'string' || !v.trim()) throw new HttpError(400, `Заполните поле «${field}».`)
  if (v.trim().length > max) throw new HttpError(400, `Поле «${field}» длиннее ${max} символов.`)
  return v.trim()
}

/** 1–5 unique skills of up to 40 characters. */
export const skills = (v: unknown, field: string) => {
  if (!Array.isArray(v) || v.length < 1 || v.length > 5) throw new HttpError(400, `«${field}»: от 1 до 5 навыков.`)
  return [...new Set(v.map((s) => text(s, field, 40)))]
}

export type Profile = {
  firstName: string
  lastName: string
  age: number
  university: string
  telegram: string // lowercase, without "@"
  whatsapp: string // digits, 7xxxxxxxxxx
  teach: string[]
  learn: string[]
  about: string | null
}

/** The ad fields shared by registration and profile editing, validated and normalized. */
export function parseProfile(b: Record<string, unknown>): Profile {
  const age = Number(b.age)
  if (!Number.isInteger(age) || age < 14 || age > 35) throw new HttpError(400, 'Возраст — от 14 до 35 лет.')
  if (age < 18 && b.parentConsent !== true) throw new HttpError(400, 'До 18 лет нужно согласие родителей.')

  const telegram = text(b.telegram, 'Telegram', 33)
  if (!TELEGRAM_RE.test(telegram)) throw new HttpError(400, 'Ник в Telegram: латиница, цифры и _, от 5 символов.')
  const whatsapp = text(b.whatsapp, 'WhatsApp', 20)
  if (!isPhone(whatsapp)) throw new HttpError(400, 'Номер WhatsApp — например, +7 701 123 45 67.')

  return {
    firstName: text(b.firstName, 'Имя'),
    lastName: text(b.lastName, 'Фамилия'),
    age,
    university: text(b.university, 'Вуз или школа', 120),
    telegram: telegram.replace(/^@/, '').toLowerCase(),
    whatsapp: normalizePhone(whatsapp),
    teach: skills(b.teach, 'Научу'),
    learn: skills(b.learn, 'Хочу научиться'),
    about: typeof b.about === 'string' && b.about.trim() ? b.about.trim().slice(0, 160) : null,
  }
}
