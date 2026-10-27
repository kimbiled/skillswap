import { useRef, useState } from 'react'
import { App, Button, Drawer, Empty, Rate } from 'antd'
import dayjs from 'dayjs'
import { Pin, vars } from './Paper'
import {
  LESSON_PRICE, availableOf, markContacted, markFailed, matchedSkill, openContact, photoUrl, ratingOf, reviewsFor,
  useDB, userById, type Exchange, type User,
} from '../lib/store'

export function years(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} год`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} года`
  return `${n} лет`
}

export const shortName = (u: User) => `${u.firstName} ${u.lastName.charAt(0)}.`
export const formatRating = (r: number) => r.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Runs an async store action with a toast for the outcome. Returns [run, busy];
 * a second call while one is in flight is ignored, so double clicks don't send twice.
 */
export function useAction() {
  const { message } = App.useApp()
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const run = async (fn: () => unknown, ok?: string) => {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    try {
      await fn()
      if (ok) message.success(ok)
      return true
    } catch (err) {
      message.error((err as Error).message)
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return [run, busy] as const
}

/** "77023334455" → "+7 702 333 44 55"; other lengths are shown as plain +digits. */
export const formatPhone = (digits: string) => {
  const m = /^(7)(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : `+${digits}`
}

/** Telegram and WhatsApp links; the server only sends them to people allowed to see them. */
export function Contacts({ user }: { user: User }) {
  if (!user.telegram && !user.whatsapp) return <span className="text-ink-3">Контакты скрыты</span>
  return (
    <span className="flex flex-col gap-1">
      {user.telegram && (
        <a href={`https://t.me/${user.telegram}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-3">
          Telegram: @{user.telegram}
        </a>
      )}
      {user.whatsapp && (
        <a href={`https://wa.me/${user.whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-3">
          WhatsApp: {formatPhone(user.whatsapp)}
        </a>
      )}
    </span>
  )
}

export function RatingLine({ user, onClick }: { user: User; onClick: () => void }) {
  const db = useDB()
  const count = reviewsFor(db, user.id).length
  const rating = ratingOf(db, user.id)
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm text-ink-2 hover:text-ink">
      <Rate disabled allowHalf value={rating} className="text-sm" />
      {count > 0 && <span className="font-bold text-ink tabular-nums">{formatRating(rating)}</span>}
      <span className="underline underline-offset-3">{count ? `Отзывы: ${count}` : 'Отзывов пока нет'}</span>
    </button>
  )
}

export function ReviewsDrawer({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const db = useDB()
  const list = reviewsFor(db, user.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <Drawer open={open} onClose={onClose} title={`Отзывы: ${shortName(user)}`} size={420}>
      {list.length === 0 ? (
        <Empty description="Пока нет отзывов" />
      ) : (
        <>
          <p className="mb-6 text-ink-2">
            Средняя оценка <span className="font-bold text-ink">{formatRating(ratingOf(db, user.id))}</span> из 5, отзывов: {list.length}
          </p>
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
                  {r.hasPhoto && <img src={photoUrl(r)} alt="Фото с урока или скриншот переписки" loading="lazy" className="mt-3 max-h-60 rounded-paper" />}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Drawer>
  )
}

type Props = {
  owner: User
  me: User | null
  exchange?: Exchange
  tilt?: number
  /** Shown above the title, e.g. "Взаимный обмен" on recommendations. */
  note?: string
  onNeedAuth: () => void
}

export default function AdCard({ owner, me, exchange, tilt = 0, note, onNeedAuth }: Props) {
  const db = useDB()
  const [run, busy] = useAction()
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const short = me ? availableOf(db, me.id) < LESSON_PRICE : false

  const reveal = () => (me ? run(() => openContact(owner.id, matchedSkill(owner, me))) : onNeedAuth())

  return (
    <article className="flyer flex flex-col" style={vars({ '--tilt': `${tilt}deg` })}>
      <Pin />
      {note && <p className="mb-2 self-start rounded-md bg-gold px-2 py-0.5 text-xs font-bold">{note}</p>}
      <p className="text-sm font-semibold text-ink-3">Научу</p>
      <h3 className="text-[25px] leading-tight font-extrabold tracking-[-0.02em] text-balance">{owner.teach.join(', ')}</h3>
      <p className="mt-3 text-sm font-semibold text-ink-3">Хочу научиться</p>
      <p className="text-lg leading-snug font-semibold">{owner.learn.join(', ')}</p>
      {owner.about && <p className="mt-3 text-ink-2">{owner.about}</p>}
      <p className="mt-3 text-sm text-ink-3">
        {shortName(owner)}, {years(owner.age)}, {owner.university}
      </p>
      <RatingLine user={owner} onClick={() => setReviewsOpen(true)} />

      <div className="mt-auto -mx-6 border-t-[1.5px] border-dashed border-rule-dash px-6 pt-4 pb-6">
        {!exchange ? (
          <>
            <Button block onClick={reveal} loading={busy} disabled={short} aria-describedby={short ? `short-${owner.id}` : undefined}>
              Показать контакты
            </Button>
            {!me && <p className="mt-2 text-center text-sm text-ink-3">Контакты видны после входа</p>}
            {short && (
              <p id={`short-${owner.id}`} className="mt-2 text-center text-sm text-ink-3">
                Урок стоит {LESSON_PRICE} SC. Проведите занятие, чтобы заработать баллы.
              </p>
            )}
          </>
        ) : (
          <div>
            <Contacts user={owner} />
            <p className="mt-4 text-sm font-semibold">Напишите сами и отметьте, как прошло:</p>
            <div className="mt-2 grid gap-2">
              <Button type="primary" block loading={busy} onClick={() => run(() => markContacted(exchange.id), 'Отметили. Обмен теперь в разделе «Мои обмены».')}>
                Связались, договорились
              </Button>
              <Button block disabled={busy} onClick={() => run(() => markFailed(exchange.id), 'Объявление перенесено в историю.')}>
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
