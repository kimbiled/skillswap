import { useState } from 'react'
import { App, Button, Drawer, Empty, Rate } from 'antd'
import dayjs from 'dayjs'
import { Pin, vars } from './Paper'
import {
  LESSON_PRICE, availableOf, markContacted, markFailed, openContact, ratingOf, reviewsFor, useDB, userById,
  type Exchange, type User,
} from '../lib/store'

export function years(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} год`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} года`
  return `${n} лет`
}

export const shortName = (u: User) => `${u.firstName} ${u.lastName.charAt(0)}.`

/** Wraps a store action so storage errors surface as a toast instead of a silent failure. */
export function useAction() {
  const { message } = App.useApp()
  return (fn: () => void, ok?: string) => {
    try {
      fn()
      if (ok) message.success(ok)
    } catch (err) {
      message.error((err as Error).message)
    }
  }
}

export function TelegramLink({ user }: { user: User }) {
  if (user.demo) {
    return (
      <span>
        <span className="font-semibold">@{user.telegram}</span>
        <span className="block text-sm text-ink-3">Демо-профиль: написать нельзя</span>
      </span>
    )
  }
  return (
    <a href={`https://t.me/${user.telegram}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-3">
      @{user.telegram}
    </a>
  )
}

export function ReviewsDrawer({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const db = useDB()
  const list = reviewsFor(db, user.id).slice().reverse()
  return (
    <Drawer open={open} onClose={onClose} title={`Отзывы: ${shortName(user)}`} size={420}>
      {list.length === 0 ? (
        <Empty description="Пока нет отзывов" />
      ) : (
        <ul className="grid gap-6">
          {list.map((r) => {
            const author = userById(db, r.authorId)
            return (
              <li key={r.id} className="border-b border-rule pb-6 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{author ? shortName(author) : 'Участник'}</span>
                  <span className="text-sm text-ink-3">{dayjs(r.createdAt).format('D MMMM YYYY')}</span>
                </div>
                <Rate disabled value={r.rating} className="mt-1 text-base" />
                <p className="mt-2 text-ink-2">{r.text}</p>
                {r.photo && <img src={r.photo} alt="Фото с урока или скриншот переписки" className="mt-3 max-h-60 rounded-paper" />}
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}

type Props = {
  owner: User
  me: User | null
  exchange?: Exchange
  tilt?: number
  onNeedAuth: () => void
}

export default function AdCard({ owner, me, exchange, tilt = 0, onNeedAuth }: Props) {
  const db = useDB()
  const run = useAction()
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const count = reviewsFor(db, owner.id).length
  const short = me ? availableOf(db, me.id) < LESSON_PRICE : false

  const reveal = () => (me ? run(() => openContact(owner.id)) : onNeedAuth())

  return (
    <article className="flyer flex flex-col" style={vars({ '--tilt': `${tilt}deg` })}>
      <Pin />
      <p className="text-sm font-semibold text-ink-3">Научу</p>
      <h3 className="text-[25px] leading-tight font-extrabold tracking-[-0.02em] text-balance">{owner.teach.join(', ')}</h3>
      <p className="mt-3 text-sm font-semibold text-ink-3">Хочу научиться</p>
      <p className="text-lg leading-snug font-semibold">{owner.learn.join(', ')}</p>
      {owner.about && <p className="mt-3 text-ink-2">{owner.about}</p>}
      <p className="mt-3 text-sm text-ink-3">
        {shortName(owner)}, {years(owner.age)}, {owner.university}
      </p>

      <button
        type="button"
        onClick={() => setReviewsOpen(true)}
        className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm text-ink-2 hover:text-ink"
      >
        <Rate disabled allowHalf value={ratingOf(db, owner.id)} className="text-sm" />
        <span className="underline underline-offset-3">{count ? `Отзывы: ${count}` : 'Отзывов пока нет'}</span>
      </button>

      <div className="mt-auto -mx-6 border-t-[1.5px] border-dashed border-rule-dash px-6 pt-4 pb-6">
        {!exchange ? (
          <>
            <Button block onClick={reveal} disabled={short} aria-describedby={short ? `short-${owner.id}` : undefined}>
              Показать Telegram
            </Button>
            {!me && <p className="mt-2 text-center text-sm text-ink-3">Контакт виден после регистрации</p>}
            {short && (
              <p id={`short-${owner.id}`} className="mt-2 text-center text-sm text-ink-3">
                Урок стоит {LESSON_PRICE} SC. Проведите занятие, чтобы заработать баллы.
              </p>
            )}
          </>
        ) : (
          <div>
            <p className="text-sm font-semibold text-ink-3">Telegram</p>
            <TelegramLink user={owner} />
            <p className="mt-4 text-sm font-semibold">Напишите сами и отметьте, как прошло:</p>
            <div className="mt-2 grid gap-2">
              <Button type="primary" block onClick={() => run(() => markContacted(exchange.id), 'Отметили. Обмен теперь в разделе «Мои обмены».')}>
                Связались, договорились
              </Button>
              <Button block onClick={() => run(() => markFailed(exchange.id), 'Объявление перенесено в историю.')}>
                Ничего не вышло
              </Button>
            </div>
          </div>
        )}
      </div>

      <ReviewsDrawer user={owner} open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
    </article>
  )
}
