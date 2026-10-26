import { Suspense, lazy, useEffect } from 'react'
import { Spin } from 'antd'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router'
import Nav from './components/Nav'
import Hero from './sections/Hero'
import Board from './sections/Board'
import Coins from './sections/Coins'
import Join from './sections/Join'
import { Faq, Footer, HowItWorks, Pricing, SafetyAndPlan, Why } from './sections/Info'
import { safeNext } from './lib/next'

// App pages load on demand, so the landing doesn't download DatePicker, Upload, Steps…
const BoardPage = lazy(() => import('./pages/Board'))
const ExchangesPage = lazy(() => import('./pages/Exchanges'))
const LoginPage = lazy(() => import('./pages/Login'))
const AdminPage = lazy(() => import('./pages/Admin'))

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
  return (
    <>
      <a href="#main" className="absolute -top-24 left-4 z-[100] rounded-control bg-ink px-4 py-3 text-white focus:top-4">
        Перейти к содержанию
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spin size="large" /></div>}>
          <Outlet />
        </Suspense>
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
  return <Join title="Регистрация" initialTeach={state?.teach} initialLearn={state?.learn} next={safeNext(params.get('next'))} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="me" element={<ExchangesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
