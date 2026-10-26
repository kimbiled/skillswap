import { useState, type FormEvent } from 'react'
import { Button, Input } from 'antd'
import { Pin, TearTabs, vars } from '../components/Paper'

type Props = {
  /** Called with what the visitor wrote, so the join form doesn't ask twice. */
  onPost: (give: string, want: string) => void
}

export default function Hero({ onPost }: Props) {
  const [give, setGive] = useState('играть на гитаре')
  const [want, setWant] = useState('английскому')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onPost(give.trim(), want.trim())
  }

  return (
    <section className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,128px)]">
      <div className="container-page grid items-center gap-[clamp(40px,6vw,88px)] lg:grid-cols-[5fr_7fr]">
        <div>
          <p className="text-[15px] font-semibold text-ink-3">Пилот в Астане, осень 2026</p>
          <h1 className="mt-4 text-[clamp(42px,4.8vw,68px)] leading-none font-extrabold tracking-[-0.04em] text-balance">
            Умеешь одно&nbsp;— научись другому.
          </h1>
          <p className="mt-6 max-w-[44ch] text-[clamp(17px,1.5vw,20px)] text-ink-2">
            SkillSwap KZ&nbsp;— бесплатная доска обмена навыками для студентов. Вы учите тому, что умеете, а взамен учитесь
            у других. Напишите своё объявление, пару мы подберём сами.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-wall bg-wall px-4 py-8 sm:px-6 sm:pt-[clamp(40px,5vw,64px)]">
          <span aria-hidden="true" className="absolute top-6 right-[22%] hidden h-[26px] w-[18px] rotate-[8deg] rounded-[1px] bg-paper/80 sm:block" />
          <span aria-hidden="true" className="absolute bottom-[32%] left-[6%] hidden h-[18px] w-3 -rotate-[14deg] rounded-[1px] bg-paper/80 sm:block" />

          <div aria-hidden="true" className="flyer fade-in absolute top-9 -left-16 hidden w-[220px] pb-8 opacity-90 sm:block" style={vars({ '--tilt': '-7deg' })}>
            <p className="text-xl leading-tight font-extrabold tracking-tight">Научу Excel</p>
            <p className="mt-2 text-[15px] text-ink-2">Сводные таблицы, формулы. Хочу домбыру.</p>
          </div>
          <div aria-hidden="true" className="flyer fade-in absolute -right-26 bottom-18 hidden w-[220px] pb-8 opacity-90 sm:block" style={vars({ '--tilt': '6deg' })}>
            <p className="text-xl leading-tight font-extrabold tracking-tight">Хочу корейский</p>
            <p className="mt-2 text-[15px] text-ink-2">Взамен помогу с физикой к ЕНТ.</p>
          </div>

          <form
            id="compose"
            onSubmit={submit}
            aria-labelledby="compose-title"
            className="flyer pin-up relative z-[2] mx-auto max-w-[420px] px-5 pt-12 [--tabs-bleed:20px] sm:px-8 sm:[--tabs-bleed:32px]"
            style={vars({ '--tilt': '-1deg' })}
          >
            <Pin />
            <p id="compose-title" className="text-[25px] leading-tight font-extrabold tracking-[-0.02em]">
              Меняю навыки
            </p>
            <label className="mt-6 block">
              <span className="block text-sm font-semibold text-ink-3">Научу</span>
              <Input
                variant="underlined"
                value={give}
                maxLength={60}
                onChange={(e) => setGive(e.target.value)}
                className="border-dashed px-0 text-xl font-semibold focus:border-solid"
              />
            </label>
            <label className="mt-6 block">
              <span className="block text-sm font-semibold text-ink-3">Хочу научиться</span>
              <Input
                variant="underlined"
                value={want}
                maxLength={60}
                onChange={(e) => setWant(e.target.value)}
                className="border-dashed px-0 text-xl font-semibold focus:border-solid"
              />
            </label>
            <p className="mt-4 text-sm text-ink-3">Перепишите строки под себя.</p>
            <TearTabs label="SkillSwap KZ" count={7} />
          </form>

          <div className="relative z-[2] mt-8 flex flex-col items-center gap-2 text-center">
            <Button type="primary" size="large" htmlType="submit" form="compose" className="w-full sm:w-auto">
              Повесить объявление
            </Button>
            <p className="text-[15px] text-ink-3">Бесплатно. Нужен только Telegram.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
