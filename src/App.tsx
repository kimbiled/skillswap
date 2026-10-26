import { Form } from 'antd'
import Nav from './components/Nav'
import Hero from './sections/Hero'
import Board from './sections/Board'
import Coins from './sections/Coins'
import Join, { type JoinValues } from './sections/Join'
import { Faq, Footer, HowItWorks, Pricing, SafetyAndPlan, Why } from './sections/Info'

export default function App() {
  const [joinForm] = Form.useForm<JoinValues>()

  // The hero flyer hands what the visitor already wrote to the join form.
  const postFlyer = (give: string, want: string) => {
    joinForm.setFieldsValue({ give, want })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('join')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
    joinForm.getFieldInstance('name')?.focus({ preventScroll: true })
  }

  return (
    <>
      <a
        href="#main"
        className="absolute -top-24 left-4 z-[100] rounded-control bg-ink px-4 py-3 text-white focus:top-4"
      >
        Перейти к содержанию
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero onPost={postFlyer} />
        <HowItWorks />
        <Board />
        <Coins />
        <Why />
        <Pricing />
        <SafetyAndPlan />
        <Faq />
        <Join form={joinForm} />
      </main>
      <Footer />
    </>
  )
}
