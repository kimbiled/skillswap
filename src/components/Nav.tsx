import { useEffect, useState } from 'react'
import { Button, Drawer } from 'antd'
import { navLinks } from '../data'
import { Logo } from './Paper'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-page transition-colors duration-300 ${scrolled ? 'border-rule' : 'border-transparent'}`}
    >
      <div className="container-page flex h-16 items-center gap-8">
        <a href="#main" className="inline-flex min-h-11 items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink" aria-label="SkillSwap KZ, на главную">
          <Logo />
          SkillSwap KZ
        </a>

        <nav aria-label="Разделы" className="ml-auto hidden gap-1 lg:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-control px-3 text-[15px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <Button type="primary" href="#join" className="hidden lg:inline-flex">
          Повесить объявление
        </Button>

        <Button className="ml-auto lg:hidden" aria-expanded={open} onClick={() => setOpen(true)}>
          Меню
        </Button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} placement="right" size={320} title="SkillSwap KZ">
        <nav aria-label="Разделы" className="flex flex-col">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex min-h-13 items-center border-b border-rule text-xl font-semibold text-ink"
            >
              {l.label}
            </a>
          ))}
          <Button type="primary" size="large" block href="#join" className="mt-6" onClick={() => setOpen(false)}>
            Повесить объявление
          </Button>
        </nav>
      </Drawer>
    </header>
  )
}
