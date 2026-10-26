import { useRef, useState } from 'react'
import { Button } from 'antd'
import { coinLessons } from '../data'
import { LESSON_PRICE as PRICE, WELCOME_BONUS } from '../lib/store'

const MAX_ROWS = 5

type Row = { id: number; text: string; delta: number }

export default function Coins() {
  const [balance, setBalance] = useState(WELCOME_BONUS)
  const [rows, setRows] = useState<Row[]>([{ id: 0, text: 'Бонус за регистрацию', delta: WELCOME_BONUS }])
  const counters = useRef({ id: 1, taught: 0, learned: 0 })

  const add = (delta: number) => {
    const c = counters.current
    const list = delta > 0 ? coinLessons.taught : coinLessons.learned
    const text = delta > 0 ? list[c.taught++ % list.length] : list[c.learned++ % list.length]
    // computed outside the updater: StrictMode runs updaters twice
    const row = { id: c.id++, text, delta }
    setRows((prev) => [row, ...prev].slice(0, MAX_ROWS))
    setBalance((b) => b + delta)
  }

  const canSpend = balance >= PRICE

  return (
    <section className="section-y" id="coins" aria-labelledby="coins-title">
      <div className="container-page grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-2">
        <div>
          <h2 className="h2" id="coins-title">Не нужно искать того, кто хочет именно вашу гитару</h2>
          <p className="lead mt-4">
            Любой урок стоит {PRICE} Skill Coins, за каждый проведённый урок вы получаете {PRICE}. Тратите их у кого
            угодно: научили Айгерим презентациям, а английский взяли у Ерлана. На первый урок дарим {WELCOME_BONUS} SC.
          </p>
          <p className="lead mt-3">Баллы нельзя купить, вывести или обменять на деньги. Это только мера времени, которое вы отдали другим.</p>
        </div>

        <div className="ledger relative max-w-[560px] rounded-paper bg-paper py-6 pr-4 pl-12 shadow-paper [--margin-x:32px] sm:py-8 sm:pr-8 sm:pl-16 sm:[--margin-x:44px]">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-semibold text-ink-3" id="ledger-label">Ваш баланс</p>
            <p className="text-[49px] leading-none font-extrabold tracking-[-0.03em] tabular-nums" aria-live="polite" aria-labelledby="ledger-label">
              {balance} <abbr title="Skill Coins" className="text-xl tracking-normal text-ink-3 no-underline">SC</abbr>
            </p>
          </div>

          <ol className="mt-6 min-h-60 border-t border-sky/45">
            {rows.length === 0 && (
              <li className="ledger-row flex min-h-12 items-center text-ink-3">Пока пусто. Проведите занятие, чтобы получить первые баллы.</li>
            )}
            {rows.map((r, i) => (
              <li key={r.id} className={`ledger-row flex min-h-12 items-center justify-between gap-4 ${i === 0 ? 'is-new' : ''}`}>
                <span>{r.text}</span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[15px] font-bold tabular-nums ${r.delta > 0 ? 'bg-gold' : 'bg-wall'}`}>
                  {r.delta > 0 ? '+' : '−'}{Math.abs(r.delta)} SC
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="primary" className="max-sm:flex-1 max-sm:basis-full" onClick={() => add(PRICE)}>
              Провести занятие
            </Button>
            <Button className="max-sm:flex-1 max-sm:basis-full" disabled={!canSpend} aria-describedby="spend-hint" onClick={() => add(-PRICE)}>
              Взять урок за {PRICE} SC
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-3" id="spend-hint">
            {canSpend ? 'Баллов хватает на урок.' : `Чтобы взять урок, нужно ${PRICE} SC. Сначала проведите занятие.`}
          </p>
        </div>
      </div>
    </section>
  )
}
