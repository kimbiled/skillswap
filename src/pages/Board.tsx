import { useMemo, useState } from 'react'
import { Button, Empty, Input, Modal, Segmented, Select, Spin } from 'antd'
import { useNavigate } from 'react-router'
import AdCard from '../components/AdCard'
import { currentUser, exchangeWith, ratingOf, recommendationsFor, reviewsFor, useDB } from '../lib/store'

const TILTS = [-1.2, 0.8, -0.4, 1.2, -0.8, 0.5]
const norm = (s: string) => s.toLowerCase().trim()

type Sort = 'new' | 'rating'

export default function BoardPage() {
  const db = useDB()
  const me = currentUser(db)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'all' | 'match'>('all')
  const [sort, setSort] = useState<Sort>('new')
  const [authOpen, setAuthOpen] = useState(false)

  const recommended = useMemo(() => (me ? recommendationsFor(db, me) : []), [db, me])

  const ads = useMemo(() => {
    const q = norm(query)
    const wanted = new Set((me?.learn ?? []).map(norm))
    const featured = new Set(query ? [] : recommended.map((r) => r.user.id))
    const list = db.users.filter((u) => {
      if (u.id === me?.id || featured.has(u.id)) return false
      // Once the visitor picked "связались" or "не вышло", the ad leaves their board for history.
      const ex = me ? exchangeWith(db, me.id, u.id) : undefined
      if (ex && ex.status !== 'opened') return false
      if (scope === 'match' && !u.teach.some((t) => wanted.has(norm(t)))) return false
      if (!q) return true
      return [...u.teach, ...u.learn, u.about ?? '', u.university].some((s) => norm(s).includes(q))
    })
    return sort === 'rating'
      ? list.sort((a, b) => ratingOf(db, b.id) - ratingOf(db, a.id) || reviewsFor(db, b.id).length - reviewsFor(db, a.id).length)
      : list // the API already returns newest first
  }, [db, me, query, scope, sort, recommended])

  const card = (u: (typeof ads)[number], i: number, note?: string) => (
    <AdCard
      key={u.id}
      owner={u}
      me={me}
      note={note}
      exchange={me ? exchangeWith(db, me.id, u.id) : undefined}
      tilt={TILTS[i % TILTS.length]}
      onNeedAuth={() => setAuthOpen(true)}
    />
  )

  return (
    <div className="section-y pt-[clamp(40px,6vw,72px)]">
      <div className="container-page">
        <h1 className="h2">Доска объявлений</h1>
        <p className="lead mt-3">
          Найдите, у кого научиться. Откройте контакты автора, напишите ему сами и отметьте, как прошло.
        </p>

        {!db.loaded ? (
          <div className="grid min-h-60 place-items-center"><Spin size="large" /></div>
        ) : (
          <>
            {db.error && <p className="mt-6 rounded-control bg-err/10 p-4 text-err">{db.error}</p>}

            {!query && recommended.length > 0 && (
              <section className="mt-10" aria-labelledby="rec-title">
                <h2 className="h3" id="rec-title">Подходят вам</h2>
                <p className="mt-1 text-ink-2">Учат тому, что вы хотите. Сначала те, кто сам хочет научиться вашему.</p>
                <div className="mt-6 grid items-start gap-6 rounded-wall bg-wall p-4 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
                  {recommended.map((r, i) => card(r.user, i, r.mutual ? 'Взаимный обмен' : undefined))}
                </div>
              </section>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3">
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
              <Select<Sort>
                size="large"
                value={sort}
                onChange={setSort}
                aria-label="Сортировка"
                className="min-w-48"
                options={[
                  { value: 'new', label: 'Сначала новые' },
                  { value: 'rating', label: 'Высокий рейтинг' },
                ]}
              />
            </div>

            <div className="mt-6 rounded-wall bg-wall p-4 sm:p-8">
              {ads.length === 0 ? (
                <Empty
                  className="py-12"
                  description={
                    db.users.length <= 1
                      ? 'Здесь пока пусто. Повесьте своё объявление первым и позовите однокурсников.'
                      : scope === 'match'
                        ? 'Пока никто не учит тому, что вы хотите. Загляните позже.'
                        : 'Ничего не нашли. Попробуйте другой навык.'
                  }
                >
                  {!me && <Button type="primary" onClick={() => navigate('/register')}>Повесить объявление</Button>}
                </Empty>
              ) : (
                <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">{ads.map((u, i) => card(u, i))}</div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        open={authOpen}
        onCancel={() => setAuthOpen(false)}
        title="Контакты видны после входа"
        footer={[
          <Button key="login" onClick={() => navigate('/login?next=/board')}>Войти</Button>,
          <Button key="register" type="primary" onClick={() => navigate('/register?next=/board')}>Зарегистрироваться</Button>,
        ]}
      >
        <p className="text-ink-2">Так Telegram и WhatsApp авторов не попадают к случайным людям. Регистрация займёт пару минут.</p>
      </Modal>
    </div>
  )
}
