import { useState, type CSSProperties } from 'react'

// Lets components pass CSS custom properties (--tilt, --tab-h…) through `style`.
export const vars = (v: Record<`--${string}`, string>) => v as CSSProperties

export function Pin() {
  return <span className="pin" aria-hidden="true" />
}

type TearTabsProps = {
  label: string
  count?: number
  /** Name used in the accessible label; omit for purely decorative tabs. */
  owner?: string
}

export function TearTabs({ label, count = 5, owner }: TearTabsProps) {
  const [torn, setTorn] = useState<ReadonlySet<number>>(new Set())
  const slots = Array.from({ length: count }, (_, i) => i)

  if (!owner) {
    return (
      <div className="tabs" aria-hidden="true">
        {slots.map((i) => <span key={i}>{label}</span>)}
      </div>
    )
  }

  return (
    <div className="tabs">
      {slots.map((i) => {
        const isTorn = torn.has(i)
        return (
          <button
            key={i}
            type="button"
            disabled={isTorn}
            className={isTorn ? 'is-torn' : undefined}
            aria-label={isTorn ? 'Листочек оторван' : `Оторвать листочек: ${owner}`}
            onClick={() => setTorn((prev) => new Set(prev).add(i))}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function Logo() {
  return (
    <svg className="size-7 fill-none stroke-ink" viewBox="0 0 28 28" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="3" width="20" height="22" rx="1.5" className="fill-paper" />
      <path d="M8 10h12M8 14h8M8 19v6M12 19v6M16 19v6M20 19v6" />
      <circle cx="14" cy="3" r="2.5" className="fill-sky stroke-none" />
    </svg>
  )
}
