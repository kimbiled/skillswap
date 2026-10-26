import { useState, type ReactNode } from 'react'
import { Badge, Button, DatePicker, Empty, Form, Input, Popconfirm, Rate, Steps, Tabs, Tag, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { Navigate, useNavigate } from 'react-router'
import { ReviewsDrawer, TelegramLink, shortName, useAction, years } from '../components/AdCard'
import {
  ACTIVE, LESSON_PRICE, WELCOME_BONUS, availableOf, balanceOf, confirmLesson, currentUser, disputeLesson, logout,
  markFailed, markMet, ratingOf, reservedOf, resetDemo, reviewsFor, scheduleExchange, submitLesson, useDB, userById,
  type Exchange, type ExchangeStatus,
} from '../lib/store'

const STEP_OF: Partial<Record<ExchangeStatus, number>> = { contacted: 1, scheduled: 2, met: 3, confirming: 4 }
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
      onFinish={(v) => run(() => submitLesson(exchange.id, { ...v, text: v.text.trim(), photo }), 'Отзыв отправлен. Ждём подтверждения от автора.')}
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

function ReviewPreview({ exchangeId }: { exchangeId: string }) {
  const db = useDB()
  const review = db.reviews.find((r) => r.exchangeId === exchangeId)
  if (!review) return null
  return (
    <div className="mt-3">
      <Rate disabled value={review.rating} className="text-sm" />
      <p className="mt-1 text-ink-2">{review.text}</p>
      {review.photo && <img src={review.photo} alt="Фото с урока или скриншот переписки" className="mt-2 max-h-40 rounded-paper" />}
    </div>
  )
}

/** A lesson the user is taking. */
function LearningCard({ exchange }: { exchange: Exchange }) {
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
        <div className="sm:text-right">
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
          { title: 'Автор подтвердил' },
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
      {exchange.status === 'confirming' && (
        <div className="mt-4">
          <p className="text-ink-2">
            Ждём, когда {teacher.firstName} подтвердит урок. После этого {LESSON_PRICE} SC перейдут к автору, а ваш отзыв появится в объявлении.
          </p>
          <ReviewPreview exchangeId={exchange.id} />
          {teacher.demo && (
            <Button className="mt-4" onClick={() => run(() => confirmLesson(exchange.id), 'Урок подтверждён.')}>
              Демо: подтвердить за автора
            </Button>
          )}
        </div>
      )}

      {exchange.status !== 'confirming' && (
        <Popconfirm
          title="Обмен не состоялся?"
          description={`Он уйдёт в историю, ${LESSON_PRICE} SC вернутся на счёт.`}
          okText="Да, не состоялся"
          cancelText="Отмена"
          onConfirm={() => run(() => markFailed(exchange.id))}
        >
          <Button type="link" className="mt-3 px-0 text-ink-3">Не состоялось</Button>
        </Popconfirm>
      )}
    </article>
  )
}

/** A lesson the user is giving: they only act when the learner asks for confirmation. */
function TeachingCard({ exchange }: { exchange: Exchange }) {
  const db = useDB()
  const run = useAction()
  const learner = userById(db, exchange.learnerId)
  if (!learner) return null

  return (
    <article className="flyer pb-6">
      <p className="text-sm font-semibold text-ink-3">Учу</p>
      <h3 className="h3">{shortName(learner)}, {years(learner.age)}, {learner.university}</h3>
      <p className="mt-1 text-sm">Telegram: <TelegramLink user={learner} /></p>
      {exchange.date && <p className="mt-2 text-ink-2">Встреча: {fmt(exchange.date)}</p>}

      {exchange.status === 'confirming' ? (
        <div className="mt-4">
          <p className="font-semibold">Ученик отметил, что урок прошёл. Подтвердите:</p>
          <ReviewPreview exchangeId={exchange.id} />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="primary" onClick={() => run(() => confirmLesson(exchange.id), `Урок подтверждён, +${LESSON_PRICE} SC.`)}>
              Подтвердить урок
            </Button>
            <Popconfirm
              title="Урока не было?"
              description="Обмен уйдёт на проверку модератору, баллы не переведутся."
              okText="Да, урока не было"
              cancelText="Отмена"
              onConfirm={() => run(() => disputeLesson(exchange.id))}
            >
              <Button>Урока не было</Button>
            </Popconfirm>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-ink-3">Когда урок пройдёт, ученик отметит это, и здесь появится кнопка подтверждения.</p>
      )}
    </article>
  )
}

const STATUS_TAG: Partial<Record<ExchangeStatus, ReactNode>> = {
  done: <Tag color="success">Урок прошёл</Tag>,
  failed: <Tag>Не вышло</Tag>,
  disputed: <Tag color="warning">На проверке</Tag>,
}

function History({ list, meId }: { list: Exchange[]; meId: string }) {
  const db = useDB()
  if (!list.length) return <Empty description="Здесь появятся завершённые обмены" />
  return (
    <ul className="grid gap-4">
      {list.map((e) => {
        const asTeacher = e.teacherId === meId
        const other = userById(db, asTeacher ? e.learnerId : e.teacherId)
        return (
          <li key={e.id} className="rounded-paper bg-paper p-5 shadow-paper">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">
                {asTeacher ? 'Учил: ' : 'Учился у: '}
                {other ? `${shortName(other)}${asTeacher ? '' : ` — ${other.teach.join(', ')}`}` : 'Участник'}
              </p>
              <span className="flex items-center gap-2">
                {e.status === 'done' && (
                  <span className={`rounded-md px-2 py-0.5 text-sm font-bold tabular-nums ${asTeacher ? 'bg-gold' : 'bg-wall'}`}>
                    {asTeacher ? '+' : '−'}{LESSON_PRICE} SC
                  </span>
                )}
                {STATUS_TAG[e.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-3">{dayjs(e.updatedAt).format('D MMMM YYYY')}</p>
            <ReviewPreview exchangeId={e.id} />
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

  const byRecent = (a: Exchange, b: Exchange) => b.updatedAt.localeCompare(a.updatedAt)
  const learning = db.exchanges.filter((e) => e.learnerId === me.id && ACTIVE.includes(e.status)).sort(byRecent)
  const teaching = db.exchanges.filter((e) => e.teacherId === me.id && ACTIVE.includes(e.status)).sort(byRecent)
  const toConfirm = teaching.filter((e) => e.status === 'confirming').length
  const history = db.exchanges
    .filter((e) => (e.learnerId === me.id || e.teacherId === me.id) && ['done', 'failed', 'disputed'].includes(e.status))
    .sort(byRecent)
  const myReviews = reviewsFor(db, me.id).length
  const balance = balanceOf(db, me.id)
  const reserved = reservedOf(db, me.id)

  return (
    <div className="section-y pt-[clamp(40px,6vw,72px)]">
      <div className="container-page max-w-[880px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="h2">Мои обмены</h1>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-3">Доступно</p>
            <p className="text-[39px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
              {availableOf(db, me.id)} <abbr title="Skill Coins" className="text-lg tracking-normal text-ink-3 no-underline">SC</abbr>
            </p>
            {reserved > 0 && <p className="mt-1 text-sm text-ink-3">Ещё {reserved} SC ждут подтверждения уроков</p>}
          </div>
        </div>

        <Tabs
          className="mt-6"
          size="large"
          // Lessons waiting for the user's confirmation come first: someone else's coins depend on it.
          defaultActiveKey={toConfirm ? 'teaching' : 'learning'}
          items={[
            {
              key: 'learning',
              label: `Учусь (${learning.length})`,
              children: learning.length ? (
                <div className="grid gap-6">{learning.map((e) => <LearningCard key={e.id} exchange={e} />)}</div>
              ) : (
                <Empty description="Активных уроков нет">
                  <Button type="primary" onClick={() => navigate('/board')}>Открыть доску</Button>
                </Empty>
              ),
            },
            {
              key: 'teaching',
              label: (
                <Badge
                  dot={toConfirm > 0}
                  offset={[6, 0]}
                  title={toConfirm ? `Ждут подтверждения: ${toConfirm}` : undefined}
                  className="[color:inherit] [font-size:inherit]"
                >
                  Учу ({teaching.length})
                </Badge>
              ),
              children: teaching.length ? (
                <div className="grid gap-6">{teaching.map((e) => <TeachingCard key={e.id} exchange={e} />)}</div>
              ) : (
                <Empty description="Пока никто не договорился с вами об уроке. Когда кто-то откроет ваше объявление и отметит «Связались», урок появится здесь." />
              ),
            },
            { key: 'history', label: `История (${history.length})`, children: <History list={history} meId={me.id} /> },
            {
              key: 'profile',
              label: 'Профиль',
              children: (
                <div className="grid gap-6">
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

                  <div className="max-w-[560px]">
                    <h2 className="h3">Skill Coins</h2>
                    <p className="mt-1 text-ink-2">
                      Урок стоит {LESSON_PRICE} SC, за проведённый урок вы получаете {LESSON_PRICE} SC. Баллы переходят, когда автор подтверждает урок.
                    </p>
                    <ul className="mt-4 border-t border-sky/45">
                      <li className="ledger-row flex min-h-12 items-center justify-between gap-4">
                        <span>Бонус за регистрацию</span>
                        <span className="rounded-md bg-gold px-2 py-0.5 text-[15px] font-bold tabular-nums">+{WELCOME_BONUS} SC</span>
                      </li>
                      {history.filter((e) => e.status === 'done').map((e) => {
                        const asTeacher = e.teacherId === me.id
                        const other = userById(db, asTeacher ? e.learnerId : e.teacherId)
                        return (
                          <li key={e.id} className="ledger-row flex min-h-12 items-center justify-between gap-4">
                            <span>{asTeacher ? 'Провели урок' : 'Урок у'} {other ? shortName(other) : ''}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[15px] font-bold tabular-nums ${asTeacher ? 'bg-gold' : 'bg-wall'}`}>
                              {asTeacher ? '+' : '−'}{LESSON_PRICE} SC
                            </span>
                          </li>
                        )
                      })}
                      <li className="flex min-h-12 items-center justify-between gap-4 font-bold">
                        <span>Баланс</span>
                        <span className="tabular-nums">{balance} SC</span>
                      </li>
                    </ul>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
