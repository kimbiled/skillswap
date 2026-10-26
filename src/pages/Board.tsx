import { useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Segmented } from 'antd'
import { useNavigate } from 'react-router'
import AdCard from '../components/AdCard'
import { currentUser, exchangeWith, useDB } from '../lib/store'

const TILTS = [-1.2, 0.8, -0.4, 1.2, -0.8, 0.5]
const norm = (s: string) => s.toLowerCase().trim()

export default function BoardPage() {
  const db = useDB()
  const me = currentUser(db)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'match'>('all')
  const [authOpen, setAuthOpen] = useState(false)

  const ads = useMemo(() => {
    const q = norm(query)
    const wanted = new Set((me?.learn ?? []).map(norm))
    return db.users.filter((u) => {
      if (u.id === me?.id) return false
      // Once the visitor picked "связались" or "не вышло", the ad leaves their board for history.
      const ex = me ? exchangeWith(db, me.id, u.id) : undefined
      if (ex && ex.status !== 'opened') return false
      if (scope === 'match' && !u.teach.some((t) => wanted.has(norm(t)))) return false
      if (!q) return true
      return [...u.teach, ...u.learn, u.about ?? '', u.university].some((s) => norm(s).includes(q))
    })
  }, [db, me, query, scope])

  return (
    <div className="section-y pt-[clamp(40px,6vw,72px)]">
      <div className="container-page">
        <h1 className="h2">Доска объявлений</h1>
        <p className="lead mt-3">
          Найдите, у кого научиться. Откройте Telegram автора, напишите ему сами и отметьте, как прошло.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            size="large"
            placeholder="Навык, например «английский»"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
            aria-label="Поиск по навыкам"
          />
          {me && (
            <Segmented
              size="large"
              value={scope}
              onChange={(v) => setScope(v as 'all' | 'match')}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'match', label: 'Учат тому, что я хочу' },
              ]}
            />
          )}
        </div>

        <div className="mt-6 rounded-wall bg-wall p-4 sm:p-8">
          {ads.length === 0 ? (
            <Empty
              className="py-12"
              description={scope === 'match' ? 'Пока никто не учит тому, что вы хотите. Загляните позже.' : 'Ничего не нашли. Попробуйте другой навык.'}
            />
          ) : (
            <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ads.map((u, i) => (
                <AdCard
                  key={u.id}
                  owner={u}
                  me={me}
                  exchange={me ? exchangeWith(db, me.id, u.id) : undefined}
                  tilt={TILTS[i % TILTS.length]}
                  onNeedAuth={() => setAuthOpen(true)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={authOpen}
        onCancel={() => setAuthOpen(false)}
        title="Контакт виден после регистрации"
        footer={[
          <Button key="later" onClick={() => setAuthOpen(false)}>Позже</Button>,
          <Button key="go" type="primary" onClick={() => navigate('/register?next=/board')}>Зарегистрироваться</Button>,
        ]}
      >
        <p className="text-ink-2">
          Так Telegram авторов не попадает к случайным людям. Регистрация займёт минуту, телефон не нужен.
        </p>
      </Modal>
    </div>
  )
}
