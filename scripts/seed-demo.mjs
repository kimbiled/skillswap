#!/usr/bin/env node
/**
 * Fills a SkillSwap KZ site with demo people and lessons through its public API,
 * the same way real users would — no database password needed.
 *
 *   npm run seed:demo -- https://your-site.vercel.app
 *
 * Demo accounts are easy to tell apart and to remove:
 *   - logins start with "demo_", Telegram handles with "ssk_demo_",
 *     WhatsApp numbers are +7 000 000 00 xx (nobody real gets messaged);
 *   - passwords are random and never printed, so nobody can log into them;
 *   - Admin → Пользователи → «Удалить демо-данные» deletes them with their lessons.
 */
import { randomBytes } from 'node:crypto'

const BASE = (process.argv[2] ?? 'http://127.0.0.1:5173').replace(/\/$/, '')

const PEOPLE = [
  ['aigerim', 'Айгерим', 'Нурланова', 20, 'Назарбаев Университет', ['Публичные выступления', 'Казахский язык'], ['Фотография'], 'Готовлю к выступлениям и защите проектов.'],
  ['daniyar', 'Данияр', 'Касымов', 21, 'КазГЮУ', ['Английский', 'IELTS'], ['Гитара'], 'IELTS 7.5, разговорная практика час в неделю.'],
  ['madina', 'Мадина', 'Ахметова', 20, 'ЕНУ им. Гумилёва', ['Figma', 'Портфолио'], ['Python'], 'Макеты, автолейаут, разбор портфолио.'],
  ['timur', 'Тимур', 'Оспанов', 19, 'Astana IT University', ['Python', 'Excel'], ['Публичные выступления'], 'Основы Python, формулы и сводные таблицы.'],
  ['nurlan', 'Нурлан', 'Жумабеков', 22, 'Казахский национальный университет искусств', ['Домбыра'], ['Excel'], 'Учу с нуля, инструмент дам на первое занятие.'],
  ['aruzhan', 'Аружан', 'Сейткали', 17, 'НИШ, 11 класс', ['Математика (ЕНТ)'], ['Монтаж видео'], 'Профильная математика, разбор вариантов ЕНТ.'],
  ['erasyl', 'Ерасыл', 'Муратов', 18, 'Astana IT University', ['Монтаж видео', 'SMM'], ['Математика (ЕНТ)'], 'Монтаж Reels и TikTok, CapCut и Premiere.'],
  ['kamila', 'Камила', 'Абенова', 21, 'Медицинский университет Астана', ['Корейский'], ['Canva'], 'Корейский с нуля до TOPIK 2, учила в Сеуле.'],
  ['arman', 'Арман', 'Сулейменов', 23, 'ЕНУ им. Гумилёва', ['Гитара', 'Вокал'], ['Английский'], 'Играю 8 лет, научу аккомпанементу и боем.'],
  ['zhanel', 'Жанель', 'Токаева', 19, 'Astana IT University', ['Excel', 'Canva'], ['Домбыра'], 'Таблицы, графики, презентации в Canva.'],
  ['alikhan', 'Алихан', 'Ержанов', 20, 'Назарбаев Университет', ['Физика (ЕНТ)', 'Веб-разработка'], ['Турецкий'], 'Физика к ЕНТ и основы HTML/CSS/JS.'],
  ['dana', 'Дана', 'Ибраимова', 22, 'КазГЮУ', ['Турецкий', 'Фотография'], ['Figma'], 'Турецкий B2, снимаю портреты на телефон.'],
]

const days = (n) => new Date(Date.now() + n * 86_400_000).toISOString()

// learner, teacher, skill, how far the lesson goes, rating, review, meeting date (days from now)
const LESSONS = [
  ['madina', 'timur', 'Python', 'done', 5, 'За час написали первый скрипт, который считает оценки. Очень понятно.', -12],
  ['timur', 'aigerim', 'Публичные выступления', 'done', 5, 'Разобрали мою защиту проекта, теперь не боюсь вопросов комиссии.', -10],
  ['daniyar', 'arman', 'Гитара', 'done', 4, 'Поставили аккорды Am, C, G и простой бой. Пальцы болят, но играю.', -9],
  ['arman', 'daniyar', 'Английский', 'done', 5, 'Час разговорной практики без стеснения, много полезных фраз.', -8],
  ['nurlan', 'zhanel', 'Excel', 'done', 5, 'Сводные таблицы наконец-то стали понятны, сделали бюджет кружка.', -7],
  ['zhanel', 'nurlan', 'Домбыра', 'done', 4, 'Сыграли первые такты «Елім-ай». Нурлан терпеливо объясняет.', -6],
  ['erasyl', 'aruzhan', 'Математика (ЕНТ)', 'done', 5, 'Разобрали два варианта ЕНТ, стало ясно, где теряю баллы.', -5],
  ['aruzhan', 'erasyl', 'Монтаж видео', 'confirming', 5, 'Смонтировали первый Reels в CapCut с переходами и субтитрами.', -2],
  ['kamila', 'zhanel', 'Canva', 'disputed', 3, 'Сделали шаблон презентации, но урок был короче, чем договаривались.', -3],
  ['aigerim', 'dana', 'Фотография', 'scheduled', null, null, 2],
  ['dana', 'madina', 'Figma', 'contacted', null, null, null],
  ['alikhan', 'dana', 'Турецкий', 'failed', null, null, null],
]

/* ---------- tiny API client with a cookie per user ---------- */

async function call(path, { method = 'POST', body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: BASE, ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${data.error ?? 'нет ответа'}`)
    err.status = res.status
    throw err
  }
  return { data, cookie: res.headers.get('set-cookie')?.split(';')[0] }
}

const state = (cookie) => call('/api/state', { method: 'GET', cookie }).then((r) => r.data)
const step = (cookie, action, payload) => call('/api/exchange', { body: { action, ...payload }, cookie })

/* ---------- run ---------- */

console.log(`Наполняю ${BASE} демо-данными…`)
const users = {}

for (const [key, firstName, lastName, age, university, teach, learn, about] of PEOPLE) {
  const n = String(Object.keys(users).length + 1).padStart(2, '0')
  try {
    const { cookie } = await call('/api/register', {
      body: {
        login: `demo_${key}`,
        password: randomBytes(18).toString('base64url'),
        firstName, lastName, age, university, about, teach, learn,
        telegram: `ssk_demo_${key}`,
        whatsapp: `+7 000 000 00 ${n}`,
        privacyConsent: true,
        parentConsent: age < 18,
      },
    })
    const me = await state(cookie)
    users[key] = { id: me.currentUserId, cookie }
    console.log(`  + demo_${key} (${firstName} ${lastName})`)
  } catch (err) {
    if (err.status === 409) {
      console.error(`\nДемо-аккаунт demo_${key} уже есть. Удалите демо-данные в админке (Пользователи → «Удалить демо-данные») и запустите снова.`)
      process.exit(1)
    }
    throw err
  }
}

for (const [learner, teacher, skill, outcome, rating, text, when] of LESSONS) {
  const L = users[learner]
  const T = users[teacher]
  await step(L.cookie, 'open', { teacherId: T.id, skill })
  const ex = (await state(L.cookie)).exchanges.find((e) => e.teacherId === T.id)

  if (outcome === 'failed') {
    await step(L.cookie, 'failed', { id: ex.id })
  } else {
    await step(L.cookie, 'contacted', { id: ex.id })
    if (outcome !== 'contacted') {
      await step(L.cookie, 'schedule', { id: ex.id, date: days(when) })
      if (outcome !== 'scheduled') {
        await step(L.cookie, 'met', { id: ex.id })
        await step(L.cookie, 'submit', { id: ex.id, review: { rating, text } })
        if (outcome === 'done') await step(T.cookie, 'confirm', { id: ex.id })
        if (outcome === 'disputed') await step(T.cookie, 'dispute', { id: ex.id })
      }
    }
  }
  console.log(`  ✓ ${learner} учится у ${teacher}: ${skill} → ${outcome}`)
}

console.log(`\nГотово: ${PEOPLE.length} участников, ${LESSONS.length} уроков. Удалить — в админке, вкладка «Пользователи».`)
