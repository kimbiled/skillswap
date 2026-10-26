import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router'
import Nav from './components/Nav'
import Hero from './sections/Hero'
import Board from './sections/Board'
import Coins from './sections/Coins'
import Join from './sections/Join'
import { Faq, Footer, HowItWorks, Pricing, SafetyAndPlan, Why } from './sections/Info'
import BoardPage from './pages/Board'
import ExchangesPage from './pages/Exchanges'

/** Scrolls to #anchors after navigation (also across pages) and to the top otherwise. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)))
    if (target) target.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Layout() {
  const { pathname } = useLocation()
  return (
    <>
      <a href="#main" className="absolute -top-24 left-4 z-[100] rounded-control bg-ink px-4 py-3 text-white focus:top-4">
        Перейти к содержанию
      </a>
      <Nav />
      {pathname !== '/' && (
        <p className="border-b border-rule bg-gold/25 px-4 py-2 text-center text-sm">
          Демо-версия: анкета и обмены хранятся только в этом браузере, объявления на доске — примеры.
        </p>
      )}
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollManager />
    </>
  )
}

function Landing() {
  const navigate = useNavigate()
  return (
    <>
      <Hero onPost={(teach, learn) => navigate('/register', { state: { teach, learn } })} />
      <HowItWorks />
      <Board />
      <Coins />
      <Why />
      <Pricing />
      <SafetyAndPlan />
      <Faq />
      <Join />
    </>
  )
}

function RegisterPage() {
  const { state } = useLocation() as { state?: { teach?: string; learn?: string } }
  const [params] = useSearchParams()
  const next = params.get('next')
  // Only same-site paths, so ?next= can't send people to another domain.
  const safeNext = next && /^\/(?!\/)/.test(next) ? next : '/board'
  return <Join title="Регистрация" initialTeach={state?.teach} initialLearn={state?.learn} next={safeNext} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="me" element={<ExchangesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
