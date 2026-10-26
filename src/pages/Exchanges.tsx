import { useState } from 'react'
import { Button, DatePicker, Empty, Form, Input, Popconfirm, Rate, Steps, Tabs, Tag, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { Navigate, useNavigate } from 'react-router'
import { ReviewsDrawer, TelegramLink, shortName, useAction, years } from '../components/AdCard'
import {
  ACTIVE, completeExchange, currentUser, logout, markFailed, markMet, ratingOf, resetDemo, reviewsFor,
  scheduleExchange, useDB, userById, type Exchange,
} from '../lib/store'

const STEP_OF: Record<string, number> = { contacted: 1, scheduled: 2, met: 3 }
const fmt = (iso: string) => dayjs(iso).format('D MMMM, HH:mm')

/** Shrinks a photo to ≤800px JPEG so a few of them fit in browser storage. */
async function downscale(file: File, max = 800): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

type FeedbackValues = { rating: number; text: string }

function FeedbackForm({ exchange }: { exchange: Exchange }) {
  const run = useAction()
  const [photo, setPhoto] = useState<string>()
  const [photoError, setPhotoError] = useState<string>()

  return (
    <Form<FeedbackValues>
      layout="vertical"
      requiredMark={false}
      className="mt-4 [&_.ant-form-item-label>label]:font-semibold"
      onFinish={(v) => run(() => completeExchange(exchange.id, { ...v, text: v.text.trim(), photo }), 'Спасибо! Отзыв появился в объявлении.')}
    >
      <Form.Item label="Как прошёл урок?" name="rating" rules={[{ required: true, message: 'Поставьте оценку.' }]}>
        <Rate />
      </Form.Item>
      <Form.Item
        label="Отзыв"
        name="text"
        rules={[{ required: true, whitespace: true, message: 'Напишите пару слов о занятии.' }, { min: 10, message: 'Хотя бы 10 символов.' }]}
      >
        <Input.TextArea rows={3} maxLength={400} showCount placeholder="Чему научились, как объясняли" />
      </Form.Item>
      <Form.Item label="Фото с урока или скриншот переписки" extra="Необязательно, но так отзыву больше доверия." validateStatus={photoError ? 'error' : undefined} help={photoError}>
        <Upload
          accept="image/*"
          maxCount={1}
          listType="picture"
          beforeUpload={async (file) => {
            try {
              setPhoto(await downscale(file))
              setPhotoError(undefined)
            } catch {
              setPhotoError('Не получилось открыть картинку. Попробуйте другой файл.')
            }
            return false // keep it local, nothing is uploaded anywhere
          }}
          onRemove={() => setPhoto(undefined)}
        >
          <Button icon={<UploadOutlined />}>Прикрепить</Button>
        </Upload>
      </Form.Item>
      <Button type="primary" htmlType="submit">Урок прошёл</Button>
    </Form>
  )
}

function ScheduleForm({ exchange }: { exchange: Exchange }) {
  const run = useAction()
  const [date, setDate] = useState<Dayjs | null>(null)
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <DatePicker
        showTime={{ format: 'HH:mm', minuteStep: 15 }}
        format="D MMMM, HH:mm"
        value={date}
        onChange={setDate}
        disabledDate={(d) => d.isBefore(dayjs(), 'day')}
        placeholder="Когда встречаетесь?"
        size="large"
        className="min-w-64"
      />
      <Button type="primary" size="large" disabled={!date} onClick={() => date && run(() => scheduleExchange(exchange.id, date.toISOString()), 'Дата сохранена.')}>
        Назначили дату
      </Button>
    </div>
  )
}

function ActiveCard({ exchange }: { exchange: Exchange }) {
  const db = useDB()
  const run = useAction()
  const teacher = userById(db, exchange.teacherId)
  if (!teacher) return null

  return (
    <article className="flyer pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-3">Учусь у</p>
          <h3 className="h3">{shortName(teacher)} — {teacher.teach.join(', ')}</h3>
          <p className="mt-1 text-sm text-ink-3">{years(teacher.age)}, {teacher.university}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-ink-3">Telegram</p>
          <TelegramLink user={teacher} />
        </div>
      </div>

      <Steps
        className="mt-6"
        size="small"
        current={STEP_OF[exchange.status]}
        items={[
          { title: 'Связались' },
          { title: 'Назначили дату', content: exchange.date ? fmt(exchange.date) : undefined },
          { title: 'Встретились' },
          { title: 'Урок прошёл' },
        ]}
      />

      {exchange.status === 'contacted' && <ScheduleForm exchange={exchange} />}
      {exchange.status === 'scheduled' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="primary" size="large" onClick={() => run(() => markMet(exchange.id))}>Встретились</Button>
          <p className="text-ink-2">Встреча: {exchange.date && fmt(exchange.date)}</p>
        </div>
      )}
      {exchange.status === 'met' && <FeedbackForm exchange={exchange} />}

      <Popconfirm
        title="Обмен не состоялся?"
        description="Он уйдёт в историю."
        okText="Да, не состоялся"
        cancelText="Отмена"
        onConfirm={() => run(() => markFailed(exchange.id))}
      >
        <Button type="link" className="mt-3 px-0 text-ink-3">Не состоялось</Button>
      </Popconfirm>
    </article>
  )
}

function History({ list }: { list: Exchange[] }) {
  const db = useDB()
  if (!list.length) return <Empty description="Здесь появятся завершённые обмены" />
  return (
    <ul className="grid gap-4">
      {list.map((e) => {
        const teacher = userById(db, e.teacherId)
        const review = db.reviews.find((r) => r.exchangeId === e.id)
        return (
          <li key={e.id} className="rounded-paper bg-paper p-5 shadow-paper">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{teacher ? `${shortName(teacher)} — ${teacher.teach.join(', ')}` : 'Участник'}</p>
              {e.status === 'done' ? <Tag color="success">Урок прошёл</Tag> : <Tag>Не вышло</Tag>}
            </div>
            <p className="mt-1 text-sm text-ink-3">{dayjs(e.updatedAt).format('D MMMM YYYY')}</p>
            {review && (
              <div className="mt-3">
                <Rate disabled value={review.rating} className="text-sm" />
                <p className="mt-1 text-ink-2">{review.text}</p>
                {review.photo && <img src={review.photo} alt="Фото с урока или скриншот переписки" className="mt-2 max-h-40 rounded-paper" />}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function ExchangesPage() {
  const db = useDB()
  const me = currentUser(db)
  const navigate = useNavigate()
  const run = useAction()
  const [reviewsOpen, setReviewsOpen] = useState(false)

  if (!me) return <Navigate to="/register?next=/me" replace />

  const mine = db.exchanges.filter((e) => e.learnerId === me.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const active = mine.filter((e) => ACTIVE.includes(e.status))
  const history = mine.filter((e) => e.status === 'done' || e.status === 'failed')
  const myReviews = reviewsFor(db, me.id).length

  return (
    <div className="section-y pt-[clamp(40px,6vw,72px)]">
      <div className="container-page max-w-[880px]">
        <h1 className="h2">Мои обмены</h1>
        <Tabs
          className="mt-6"
          size="large"
          items={[
            {
              key: 'active',
              label: `Активные (${active.length})`,
              children: active.length ? (
                <div className="grid gap-6">{active.map((e) => <ActiveCard key={e.id} exchange={e} />)}</div>
              ) : (
                <Empty description="Активных обменов нет">
                  <Button type="primary" onClick={() => navigate('/board')}>Открыть доску</Button>
                </Empty>
              ),
            },
            { key: 'history', label: `История (${history.length})`, children: <History list={history} /> },
            {
              key: 'profile',
              label: 'Профиль',
              children: (
                <div className="flyer max-w-[560px] pb-6">
                  <p className="h3">{me.firstName} {me.lastName}</p>
                  <p className="mt-1 text-ink-3">{years(me.age)}, {me.university}, @{me.telegram}</p>
                  <p className="mt-4 text-sm font-semibold text-ink-3">Научу</p>
                  <p className="text-lg font-semibold">{me.teach.join(', ')}</p>
                  <p className="mt-3 text-sm font-semibold text-ink-3">Хочу научиться</p>
                  <p className="text-lg font-semibold">{me.learn.join(', ')}</p>
                  {me.about && <p className="mt-3 text-ink-2">{me.about}</p>}
                  <button type="button" onClick={() => setReviewsOpen(true)} className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink-2 hover:text-ink">
                    <Rate disabled allowHalf value={ratingOf(db, me.id)} className="text-sm" />
                    <span className="underline underline-offset-3">{myReviews ? `Отзывы обо мне: ${myReviews}` : 'Отзывов о вас пока нет'}</span>
                  </button>
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-rule pt-4">
                    <Button onClick={() => run(() => { logout(); navigate('/') })}>Выйти</Button>
                    <Popconfirm
                      title="Сбросить демо-данные?"
                      description="Удалятся ваш профиль, обмены и отзывы в этом браузере."
                      okText="Сбросить"
                      cancelText="Отмена"
                      onConfirm={() => run(() => { resetDemo(); navigate('/') })}
                    >
                      <Button danger type="text">Сбросить демо</Button>
                    </Popconfirm>
                  </div>
                  <ReviewsDrawer user={me} open={reviewsOpen} onClose={() => setReviewsOpen(false)} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
