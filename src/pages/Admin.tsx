import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, App, Button, Empty, Input, Popconfirm, Rate, Select, Spin, Table, Tabs, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { Navigate } from 'react-router'
import { useAction } from '../components/AdCard'
import { api, currentUser, refresh, useDB } from '../lib/store'

type Person = { id: string; login: string; name?: string; telegram?: string; whatsapp?: string }

type QueueItem = {
  id: string
  status: 'disputed' | 'confirming'
  skill?: string
  date?: string
  updatedAt: string
  learner: Person
  teacher: Person
  review?: { id: string; rating: number; text: string; hasPhoto: boolean }
}

type LogEvent = {
  id: string
  at: string
  type: string
  details?: Record<string, unknown>
  exchangeId?: string
  skill?: string
  actor?: Person
  target?: Person
}

type AdminUser = {
  id: string
  login: string
  name: string
  age: number
  university: string
  telegram: string
  whatsapp: string
  createdAt: string
  locked: boolean
  taught: number
  learned: number
  balance: number
  reserved: number
}

type AdminData = {
  stats: Record<'users' | 'done' | 'active' | 'disputed' | 'confirming' | 'events_24h', number>
  queue: QueueItem[]
  events: LogEvent[]
  users: AdminUser[]
}

const EVENT_LABEL: Record<string, { label: string; color?: string }> = {
  register: { label: 'Регистрация', color: 'blue' },
  login: { label: 'Вход' },
  login_failed: { label: 'Неверный пароль', color: 'orange' },
  login_locked: { label: 'Вход заблокирован', color: 'red' },
  logout: { label: 'Выход' },
  open: { label: 'Открыл контакты', color: 'cyan' },
  contacted: { label: 'Связались', color: 'cyan' },
  failed: { label: 'Не вышло' },
  schedule: { label: 'Назначили дату', color: 'cyan' },
  met: { label: 'Встретились', color: 'cyan' },
  submit: { label: 'Урок отмечен', color: 'gold' },
  confirm: { label: 'Автор подтвердил', color: 'green' },
  dispute: { label: 'Урок оспорен', color: 'red' },
  admin_resolve: { label: 'Решение админа', color: 'purple' },
  admin_reset_password: { label: 'Сброс пароля', color: 'purple' },
  admin_purge_demo: { label: 'Удалены демо-данные', color: 'purple' },
  profile_update: { label: 'Изменил профиль', color: 'blue' },
  password_change: { label: 'Сменил пароль', color: 'blue' },
  ad_hide: { label: 'Удалил объявление', color: 'orange' },
  ad_show: { label: 'Вернул объявление', color: 'blue' },
}

const FIELD_LABEL: Record<string, string> = {
  firstName: 'имя', lastName: 'фамилия', age: 'возраст', university: 'вуз', telegram: 'Telegram',
  whatsapp: 'WhatsApp', teach: '«Научу»', learn: '«Хочу научиться»', about: 'о себе',
}

const fmt = (iso?: string) => (iso ? dayjs(iso).format('D MMM YYYY, HH:mm') : '—')
const who = (p?: Person) => (p ? `${p.name ?? p.login} (${p.login})` : '—')
const formatPhone = (d: string) => {
  const m = /^(7)(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(d)
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : `+${d}`
}

/** Short human summary of an event's details. */
function describe(e: LogEvent) {
  const d = e.details ?? {}
  const parts: string[] = []
  if (e.skill) parts.push(`навык: ${e.skill}`)
  if (typeof d.date === 'string') parts.push(`встреча: ${fmt(d.date)}`)
  if (typeof d.rating === 'number') parts.push(`оценка: ${d.rating}${d.photo ? ', с фото' : ''}`)
  if (d.decision) parts.push(d.decision === 'done' ? 'урок засчитан' : 'урок отклонён')
  if (d.from) parts.push(`был статус: ${d.from === 'disputed' ? 'спор' : 'ждал автора'}`)
  if (typeof d.login === 'string') parts.push(`логин «${d.login}»`)
  if (d.reason === 'unknown_login') parts.push('такого логина нет')
  if (typeof d.attempt === 'number') parts.push(`попытка ${d.attempt}`)
  if (typeof d.note === 'string') parts.push(`«${d.note}»`)
  if (typeof d.removed === 'number') parts.push(`удалено аккаунтов: ${d.removed}`)
  if (Array.isArray(d.changed)) parts.push(`изменено: ${d.changed.map((f) => FIELD_LABEL[f as string] ?? f).join(', ')}`)
  if (typeof d.ip === 'string') parts.push(`IP ${d.ip}`)
  return parts.join(', ')
}

function Contact({ p }: { p: Person }) {
  return (
    <span className="flex flex-col text-sm">
      <span className="font-semibold">{who(p)}</span>
      {p.telegram && <a className="underline underline-offset-3" href={`https://t.me/${p.telegram}`} target="_blank" rel="noopener noreferrer">Telegram: @{p.telegram}</a>}
      {p.whatsapp && <a className="underline underline-offset-3" href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp: {formatPhone(p.whatsapp)}</a>}
    </span>
  )
}

function QueueCard({ item, onDone }: { item: QueueItem; onDone: () => void }) {
  const [run, busy] = useAction()
  const [note, setNote] = useState('')
  const waitingDays = dayjs().diff(dayjs(item.updatedAt), 'day')
  const resolve = (decision: 'done' | 'failed') =>
    run(async () => {
      await api('/api/admin', { body: { action: 'resolve', id: item.id, decision, note } })
      onDone()
    }, decision === 'done' ? 'Урок засчитан, баллы переведены.' : 'Урок отклонён, баллы вернулись ученику.')

  return (
    <article className="rounded-paper bg-paper p-5 shadow-paper">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="h3">
          {item.skill ?? 'Урок'}
          {item.date && <span className="ml-2 text-base font-normal text-ink-3">встреча {fmt(item.date)}</span>}
        </p>
        {item.status === 'disputed' ? (
          <Tag color="red">Автор: «урока не было»</Tag>
        ) : (
          <Tag color={waitingDays >= 3 ? 'orange' : 'gold'}>Ждёт автора {waitingDays ? `${waitingDays} дн.` : 'с сегодня'}</Tag>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><p className="text-sm text-ink-3">Ученик</p><Contact p={item.learner} /></div>
        <div><p className="text-sm text-ink-3">Учитель (автор объявления)</p><Contact p={item.teacher} /></div>
      </div>

      {item.review ? (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-sm text-ink-3">Отзыв ученика</p>
          <Rate disabled value={item.review.rating} className="text-sm" />
          <p className="mt-1 text-ink-2">{item.review.text}</p>
          {item.review.hasPhoto ? (
            <a href={`/api/photo?id=${item.review.id}`} target="_blank" rel="noopener noreferrer">
              <img src={`/api/photo?id=${item.review.id}`} alt="Фото с урока или скриншот переписки" className="mt-2 max-h-56 rounded-paper" />
            </a>
          ) : (
            <p className="mt-1 text-sm text-ink-3">Без фото</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-3">Отзыва нет</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <Input
          placeholder="Комментарий для журнала (необязательно)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          className="max-w-sm"
        />
        <Popconfirm title="Засчитать урок?" description="10 SC перейдут учителю, отзыв опубликуется." okText="Засчитать" cancelText="Отмена" onConfirm={() => resolve('done')}>
          <Button type="primary" loading={busy}>Засчитать урок</Button>
        </Popconfirm>
        <Popconfirm title="Отклонить урок?" description="Баллы вернутся ученику, отзыв не опубликуется." okText="Отклонить" cancelText="Отмена" onConfirm={() => resolve('failed')}>
          <Button danger disabled={busy}>Отклонить</Button>
        </Popconfirm>
      </div>
    </article>
  )
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="border-t-2 border-ink pt-3">
      <p className="text-[31px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-ink-2">{label}</p>
    </div>
  )
}

function EventsTable({ events }: { events: LogEvent[] }) {
  const [types, setTypes] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      if (types.length && !types.includes(e.type)) return false
      if (!q) return true
      return [who(e.actor), who(e.target), describe(e)].some((s) => s.toLowerCase().includes(q))
    })
  }, [events, types, query])

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          mode="multiple"
          allowClear
          placeholder="Все события"
          value={types}
          onChange={setTypes}
          options={Object.entries(EVENT_LABEL).map(([value, { label }]) => ({ value, label }))}
          className="min-w-64"
          aria-label="Фильтр по типу события"
        />
        <Input.Search allowClear placeholder="Логин, имя, IP…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" aria-label="Поиск по журналу" />
      </div>
      <Table<LogEvent>
        rowKey="id"
        size="middle"
        dataSource={rows}
        pagination={{ pageSize: 50, showSizeChanger: false }}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Время', dataIndex: 'at', width: 170, render: (v: string) => <span className="tabular-nums">{dayjs(v).format('D MMM, HH:mm:ss')}</span> },
          {
            title: 'Событие',
            dataIndex: 'type',
            width: 180,
            render: (t: string) => <Tag color={EVENT_LABEL[t]?.color}>{EVENT_LABEL[t]?.label ?? t}</Tag>,
          },
          { title: 'Кто', render: (_, e) => who(e.actor) },
          { title: 'С кем', render: (_, e) => who(e.target) },
          { title: 'Детали', render: (_, e) => <span className="text-ink-2">{describe(e)}</span> },
        ]}
        locale={{ emptyText: 'Событий нет' }}
      />
      <p className="mt-2 text-sm text-ink-3">Показаны последние 500 событий.</p>
    </>
  )
}

function UsersTable({ users, onChange }: { users: AdminUser[]; onChange: () => void }) {
  const { modal } = App.useApp()
  const [run] = useAction()
  const [query, setQuery] = useState('')
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? users.filter((u) => [u.name, u.login, u.telegram, u.whatsapp, u.university].some((s) => s.toLowerCase().includes(q))) : users
  }, [users, query])

  const reset = (u: AdminUser) =>
    run(async () => {
      const r = await api<{ login: string; password: string }>('/api/admin', { body: { action: 'reset_password', id: u.id } })
      onChange()
      modal.success({
        title: `Новый пароль для ${u.name}`,
        content: (
          <div>
            <p>Логин: <b>{r.login}</b></p>
            <p>Временный пароль: <Typography.Text code copyable>{r.password}</Typography.Text></p>
            <p className="mt-2 text-ink-3">Отправьте его пользователю в Telegram. Пароль показывается один раз, старые сессии пользователя закрыты.</p>
          </div>
        ),
      })
    })

  const demoCount = users.filter((u) => u.login.startsWith('demo_')).length
  const purgeDemo = () =>
    run(async () => {
      await api('/api/admin', { body: { action: 'purge_demo' } })
      onChange()
    }, 'Демо-данные удалены.')

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Input.Search allowClear placeholder="Имя, логин, Telegram, телефон…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" aria-label="Поиск пользователей" />
        {demoCount > 0 && (
          <Popconfirm
            title={`Удалить демо-аккаунты (${demoCount})?`}
            description="Удалятся пользователи с логином demo_… вместе с их уроками и отзывами. Настоящие аккаунты не затронет."
            okText="Удалить"
            okButtonProps={{ danger: true }}
            cancelText="Отмена"
            onConfirm={purgeDemo}
          >
            <Button danger>Удалить демо-данные ({demoCount})</Button>
          </Popconfirm>
        )}
      </div>
      <Table<AdminUser>
        rowKey="id"
        size="middle"
        dataSource={rows}
        pagination={{ pageSize: 30, showSizeChanger: false }}
        scroll={{ x: 1100 }}
        columns={[
          {
            title: 'Пользователь',
            render: (_, u) => (
              <span className="flex flex-col">
                <span className="font-semibold">{u.name}{u.locked && <Tag color="red" className="ml-2">вход заблокирован</Tag>}</span>
                <span className="text-sm text-ink-3">{u.login}, {u.age} лет, {u.university}</span>
              </span>
            ),
          },
          {
            title: 'Контакты',
            render: (_, u) => (
              <span className="flex flex-col text-sm">
                <a className="underline underline-offset-3" href={`https://t.me/${u.telegram}`} target="_blank" rel="noopener noreferrer">@{u.telegram}</a>
                <a className="underline underline-offset-3" href={`https://wa.me/${u.whatsapp}`} target="_blank" rel="noopener noreferrer">{formatPhone(u.whatsapp)}</a>
              </span>
            ),
          },
          { title: 'Провёл', dataIndex: 'taught', width: 90, sorter: (a, b) => a.taught - b.taught },
          { title: 'Прошёл', dataIndex: 'learned', width: 90, sorter: (a, b) => a.learned - b.learned },
          {
            title: 'Баланс',
            width: 120,
            sorter: (a, b) => a.balance - b.balance,
            render: (_, u) => <span className="tabular-nums">{u.balance} SC{u.reserved ? <span className="block text-xs text-ink-3">в резерве {u.reserved}</span> : null}</span>,
          },
          { title: 'Регистрация', dataIndex: 'createdAt', width: 150, render: (v: string) => fmt(v), sorter: (a, b) => a.createdAt.localeCompare(b.createdAt), defaultSortOrder: 'descend' },
          {
            title: '',
            width: 160,
            render: (_, u) => (
              <Popconfirm title="Сбросить пароль?" description="Будет создан временный пароль, все сессии пользователя закроются." okText="Сбросить" cancelText="Отмена" onConfirm={() => reset(u)}>
                <Button size="small">Сбросить пароль</Button>
              </Popconfirm>
            ),
          },
        ]}
        locale={{ emptyText: 'Пользователей нет' }}
      />
    </>
  )
}

export default function AdminPage() {
  const db = useDB()
  const me = currentUser(db)
  const [data, setData] = useState<AdminData>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api<AdminData>('/api/admin'))
      setError(undefined)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const canLoad = Boolean(db.loaded && me && db.isAdmin)
  useEffect(() => {
    if (canLoad) void load()
  }, [canLoad, load])

  const afterChange = () => {
    void load()
    void refresh() // balances in the header may have changed
  }

  if (!db.loaded) return <div className="grid min-h-[50vh] place-items-center"><Spin size="large" /></div>
  if (!me) return <Navigate to="/login?next=/admin" replace />
  if (!db.isAdmin) {
    return (
      <div className="section-y container-page">
        <h1 className="h2">Нет доступа</h1>
        <p className="lead mt-4">Эта страница только для администраторов. Если вы администратор, попросите добавить ваш логин в ADMIN_LOGINS.</p>
      </div>
    )
  }

  const disputed = data?.queue.filter((q) => q.status === 'disputed') ?? []
  const confirming = data?.queue.filter((q) => q.status === 'confirming') ?? []

  return (
    <div className="section-y pt-[clamp(40px,6vw,72px)]">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="h2">Админка</h1>
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>Обновить</Button>
        </div>

        {error && <Alert type="error" message={error} className="mt-6" showIcon />}

        {!data ? (
          <div className="grid min-h-60 place-items-center"><Spin size="large" /></div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              <Stat value={data.stats.users} label="пользователей" />
              <Stat value={data.stats.done} label="уроков засчитано" />
              <Stat value={data.stats.active} label="обменов в процессе" />
              <Stat value={data.stats.confirming} label="ждут автора" />
              <Stat value={data.stats.disputed} label="споров" />
              <Stat value={data.stats.events_24h} label="событий за сутки" />
            </div>

            <Tabs
              className="mt-8"
              size="large"
              defaultActiveKey={disputed.length ? 'disputed' : confirming.length ? 'confirming' : 'log'}
              items={[
                {
                  key: 'disputed',
                  label: `Споры (${disputed.length})`,
                  children: disputed.length ? (
                    <div className="grid gap-4">{disputed.map((item) => <QueueCard key={item.id} item={item} onDone={afterChange} />)}</div>
                  ) : (
                    <Empty description="Споров нет" />
                  ),
                },
                {
                  key: 'confirming',
                  label: `Ждут подтверждения (${confirming.length})`,
                  children: confirming.length ? (
                    <div className="grid gap-4">
                      <p className="text-ink-2">Ученик отметил урок, автор ещё не подтвердил. Обычно ждём автора; решайте сами, если он долго не отвечает.</p>
                      {confirming.map((item) => <QueueCard key={item.id} item={item} onDone={afterChange} />)}
                    </div>
                  ) : (
                    <Empty description="Все уроки подтверждены" />
                  ),
                },
                { key: 'log', label: 'Журнал', children: <EventsTable events={data.events} /> },
                { key: 'users', label: `Пользователи (${data.users.length})`, children: <UsersTable users={data.users} onChange={afterChange} /> },
              ]}
            />
          </>
        )}
      </div>
    </div>
  )
}
