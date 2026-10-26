import { Button, Collapse, Tag, Timeline } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { faq, plans, roadmap, safety, sources, steps } from '../data'

export function HowItWorks() {
  return (
    <section className="section-y" id="how" aria-labelledby="how-title">
      <div className="container-page">
        <h2 className="h2" id="how-title">Как это работает</h2>
        <ol className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-ink pt-6">
              <span aria-hidden="true" className="mb-6 block text-[49px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
                {i + 1}
              </span>
              <h3 className="h3">{s.title}</h3>
              <p className="mt-2 text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const Ref = ({ n }: { n: number }) => (
  <sup className="text-[0.5em] leading-none">
    <a href={`#src-${n}`} aria-label={`Источник ${n}`} className="px-px text-ink-3 no-underline hover:text-ink hover:underline">
      {n}
    </a>
  </sup>
)

export function Why() {
  return (
    <section className="section-y bg-paper" aria-labelledby="why-title">
      <div className="container-page [&>*]:max-w-[960px]">
        <h2 className="h2" id="why-title">Зачем это Казахстану</h2>
        <p className="mt-8 text-[clamp(22px,2.4vw,31px)] leading-[1.45] font-medium tracking-[-0.015em] text-pretty [&_strong]:font-extrabold">
          В стране <strong>5,82&nbsp;млн</strong> человек в возрасте 14–34 лет, около 28% населения<Ref n={1} />. Примерно{' '}
          <strong>4 из 10</strong> работников трудятся не по своей подготовке<Ref n={2} />, а <strong>6,5%</strong> молодёжи не
          учатся и не работают<Ref n={3} />. Знания у студентов уже есть, им не хватает способа ими обмениваться. А с
          интернетом у <strong>93,4%</strong> жителей<Ref n={4} /> обмен работает и между городами.
        </p>
        <p className="mt-6 max-w-[60ch] text-ink-2">
          Эти цифры показывают масштаб, а не число наших пользователей. Будут ли студенты на самом деле меняться навыками, мы
          проверяем в пилоте.
        </p>
        <ol className="mt-8 grid list-inside list-decimal gap-1 border-t border-rule pt-4 text-sm text-ink-3">
          {sources.map((s, i) => (
            <li key={s} id={`src-${i + 1}`} className="target:font-semibold target:text-ink">{s}</li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Pricing() {
  return (
    <section className="section-y" id="pricing" aria-labelledby="pricing-title">
      <div className="container-page">
        <div className="mb-12">
          <h2 className="h2" id="pricing-title">Сколько стоит</h2>
          <p className="lead mt-4">
            Обмен знаниями бесплатный и таким останется. Платить будут только за дополнительные функции и учебные заведения
            за свои программы.
          </p>
        </div>
        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {plans.map((p) => (
            <div key={p.title} className="flex flex-col border-t-2 border-ink pt-6">
              <h3 className="h3 flex items-center gap-2">
                {p.title}
                {p.tag && <Tag variant="filled" className="m-0 bg-wall font-semibold text-ink">{p.tag}</Tag>}
              </h3>
              <p className="mt-3 mb-4 text-[39px] leading-tight font-extrabold tracking-[-0.03em]">
                {p.price}
                {p.unit && <small className="ml-2 text-base font-medium tracking-normal text-ink-3">{p.unit}</small>}
              </p>
              <ul className="mb-6 flex-1">
                {p.items.map((it) => (
                  <li key={it} className="border-b border-rule py-2 text-ink-2">{it}</li>
                ))}
              </ul>
              {p.cta && (
                <Button block type={p.cta.primary ? 'primary' : 'default'} href={p.cta.href}>
                  {p.cta.label}
                </Button>
              )}
              {p.note && <p className="mt-auto pt-2 text-sm text-ink-3">{p.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SafetyAndPlan() {
  return (
    <section className="section-y bg-paper" aria-labelledby="safety-title">
      <div className="container-page grid gap-[clamp(48px,7vw,112px)] lg:grid-cols-2">
        <div>
          <h2 className="h2" id="safety-title">Безопасность</h2>
          <ul className="mt-8">
            {safety.map((s) => (
              <li key={s.title} className="border-t border-rule py-4">
                <h3 className="h3">{s.title}</h3>
                <p className="mt-1 text-ink-2">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="h2" id="plan-title">План</h2>
          <Timeline
            className="mt-8"
            aria-labelledby="plan-title"
            items={roadmap.map((r) => ({
              color: r.current ? '#1B2A6B' : 'rgba(27, 42, 107, 0.32)',
              content: (
                <div className="pb-2">
                  <p className={`text-sm font-semibold ${r.current ? 'text-ink' : 'text-ink-3'}`}>{r.when}</p>
                  <h3 className="h3 mt-1">{r.title}</h3>
                  <p className="mt-1 text-ink-2">{r.text}</p>
                </div>
              ),
            }))}
          />
        </div>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section className="section-y" id="faq" aria-labelledby="faq-title">
      <div className="container-page grid items-start gap-[clamp(32px,6vw,96px)] lg:grid-cols-[1fr_2fr]">
        <h2 className="h2" id="faq-title">Вопросы</h2>
        <Collapse
          ghost
          accordion
          expandIconPlacement="end"
          expandIcon={({ isActive }) => (
            <span className="grid size-8 place-items-center rounded-full border border-rule-dash">
              <PlusOutlined rotate={isActive ? 45 : 0} className="transition-transform duration-300" />
            </span>
          )}
          className="rounded-none border-b border-rule [&_.ant-collapse-header]:min-h-16 [&_.ant-collapse-header]:items-center! [&_.ant-collapse-item]:border-t [&_.ant-collapse-item]:border-rule"
          items={faq.map((f, i) => ({
            key: String(i),
            label: <span className="text-lg font-semibold tracking-[-0.01em] sm:text-xl">{f.q}</span>,
            children: <p className="max-w-[60ch] text-ink-2">{f.a}</p>,
          }))}
        />
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-rule py-8">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <p className="font-bold">SkillSwap KZ, Астана, 2026</p>
        <nav aria-label="Ссылки в подвале" className="flex flex-wrap gap-x-2">
          {[
            ['#how', 'Как это работает'],
            ['#pricing', 'Вузам'],
            ['#faq', 'Вопросы'],
            ['mailto:hello@skillswap.kz', 'hello@skillswap.kz'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="inline-flex min-h-11 items-center px-2 text-[15px] text-ink-2 hover:text-ink hover:underline">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
