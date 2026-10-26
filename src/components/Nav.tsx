import { useEffect, useState } from 'react'
import { Badge, Button, Drawer } from 'antd'
import { Link, NavLink, useNavigate } from 'react-router'
import { navLinks } from '../data'
import { ACTIVE, availableOf, currentUser, useDB } from '../lib/store'
import { Logo } from './Paper'

const linkClass = 'inline-flex min-h-11 items-center rounded-control px-3 text-[15px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const db = useDB()
  const me = currentUser(db)
  // Lessons the user is taking, plus lessons they teach that wait for their confirmation.
  const pending = me
    ? db.exchanges.filter((e) => (e.learnerId === me.id && ACTIVE.includes(e.status)) || (e.teacherId === me.id && e.status === 'confirming')).length
    : 0
  const coins = me ? availableOf(db, me.id) : 0

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <header className={`sticky top-0 z-50 border-b bg-page transition-colors duration-300 ${scrolled ? 'border-rule' : 'border-transparent'}`}>
      <div className="container-page flex h-16 items-center gap-6">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink" aria-label="SkillSwap KZ, на главную">
          <Logo />
          SkillSwap KZ
        </Link>

        <nav aria-label="Разделы" className="ml-auto hidden items-center gap-1 lg:flex">
          <NavLink to="/board" className={({ isActive }) => `${linkClass} ${isActive ? 'bg-ink/5 text-ink' : ''}`}>
            Доска
          </NavLink>
          {navLinks.map((l) => (
            <Link key={l.href} to={`/${l.href}`} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {me ? (
            <>
              <span className="rounded-md bg-gold px-2 py-0.5 text-sm font-bold tabular-nums" title="Доступно Skill Coins">
                {coins} SC
              </span>
              <Badge count={pending} size="small" color="#1B2A6B">
                <Button onClick={() => go('/me')}>Мои обмены</Button>
              </Badge>
            </>
          ) : (
            <Button type="primary" onClick={() => go('/register')}>Регистрация</Button>
          )}
        </div>

        <Button className="ml-auto lg:hidden" aria-expanded={open} onClick={() => setOpen(true)}>
          Меню
        </Button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} placement="right" size={320} title="SkillSwap KZ">
        <nav aria-label="Разделы" className="flex flex-col">
          {[{ href: '/board', label: 'Доска' }, ...navLinks.map((l) => ({ href: `/${l.href}`, label: l.label }))].map((l) => (
            <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="flex min-h-13 items-center border-b border-rule text-xl font-semibold text-ink">
              {l.label}
            </Link>
          ))}
          <Button type="primary" size="large" block className="mt-6" onClick={() => go(me ? '/me' : '/register')}>
            {me ? `Мои обмены${pending ? ` (${pending})` : ''}, ${coins} SC` : 'Регистрация'}
          </Button>
        </nav>
      </Drawer>
    </header>
  )
}
