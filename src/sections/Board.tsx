import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { exampleFlyers } from '../data'
import { Pin, TearTabs, vars } from '../components/Paper'

export default function Board() {
  return (
    <section className="section-y bg-wall" aria-labelledby="board-title">
      <div className="container-page">
        <div className="mb-12">
          <h2 className="h2" id="board-title">Что вешают на доску</h2>
          <p className="lead mt-4">Это примеры, а не реальные участники. Нажмите на листочек внизу объявления, чтобы оторвать его.</p>
        </div>

        <div className="grid items-start gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {exampleFlyers.map((f, i) => (
            <article
              key={f.title}
              className={`flyer [--tab-h:84px] ${i % 2 ? 'sm:mt-6' : ''}`}
              style={vars({ '--tilt': `${f.tilt}deg` })}
            >
              <Pin />
              <h3 className="text-[25px] leading-tight font-extrabold tracking-[-0.02em] text-balance">{f.title}</h3>
              <p className="mt-2 text-base text-ink-2">{f.text}</p>
              <p className="mt-3 text-sm text-ink-3">{f.meta}</p>
              <TearTabs label={f.name} owner={f.name} />
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-8">
          <p className="max-w-[60ch] text-xl">
            На старте шесть направлений: языки, IT и код, дизайн, музыка, подготовка к ЕНТ и IELTS, монтаж и выступления.
            Если вашего навыка нет, просто напишите его в объявлении.
          </p>
          <div className="grid max-w-[900px] gap-8 sm:grid-cols-2">
            <div>
              <h3 className="h3 flex items-center gap-2"><CheckOutlined className="text-ok" aria-hidden="true" />Можно</h3>
              <p className="mt-2 text-ink-2">Объяснять, практиковаться вместе, разбирать работы, делать совместные проекты.</p>
            </div>
            <div>
              <h3 className="h3 flex items-center gap-2"><CloseOutlined className="text-err" aria-hidden="true" />Нельзя</h3>
              <p className="mt-2 text-ink-2">Делать домашние задания и курсовые за других, помогать списывать, брать деньги в обход платформы.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
