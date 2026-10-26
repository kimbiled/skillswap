import { useState } from 'react'
import { Button, Form, Input, type FormInstance } from 'antd'
import { Pin, TearTabs, vars } from '../components/Paper'

// Where join-form submissions go (Google Apps Script, Formspree, own API…).
// Empty = no network request, the form only shows the success state.
const FORM_ENDPOINT = ''

export type JoinValues = {
  name: string
  school: string
  give: string
  want: string
  telegram: string
}

type Status = { ok: boolean; text: string } | null

const fieldClass = 'border-dashed px-0 text-lg font-medium focus:border-solid'

export default function Join({ form }: { form: FormInstance<JoinValues> }) {
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const telegram = Form.useWatch('telegram', form)?.trim()
  const handle = telegram ? (telegram.startsWith('@') ? telegram : `@${telegram}`) : '@username'

  const onFinish = async (values: JoinValues) => {
    setSending(true)
    setStatus(null)
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      }
      form.resetFields()
      setStatus({ ok: true, text: 'Объявление висит. Напишем в Telegram, когда найдём пару.' })
    } catch (err) {
      console.error('Join form submit failed:', err)
      setStatus({ ok: false, text: 'Заявка не отправилась. Проверьте интернет и попробуйте ещё раз или напишите на hello@skillswap.kz.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="section-y bg-wall" id="join" aria-labelledby="join-title">
      <div className="container-page grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[5fr_6fr]">
        <div>
          <h2 className="h2" id="join-title">Повесьте своё объявление</h2>
          <p className="lead mt-4">Пилот идёт в Астане. Мы лично подберём вам первую пару и напишем в Telegram.</p>
          <p className="mt-6 text-ink-2">
            Вопросы:{' '}
            <a className="text-ink underline underline-offset-3 hover:decoration-2" href="mailto:hello@skillswap.kz">
              hello@skillswap.kz
            </a>
          </p>
        </div>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={onFinish}
          scrollToFirstError={{ block: 'center' }}
          className="flyer w-full max-w-[520px] px-5 pt-12 [--tabs-bleed:20px] sm:px-8 sm:[--tabs-bleed:32px] [&_.ant-form-item-label>label]:font-semibold"
          style={vars({ '--tilt': '0.4deg' })}
        >
          <Pin />
          <Form.Item label="Имя" name="name" rules={[{ required: true, whitespace: true, message: 'Напишите, как к вам обращаться.' }]}>
            <Input variant="underlined" size="large" autoComplete="given-name" className={fieldClass} />
          </Form.Item>
          <Form.Item label="Вуз или школа" name="school" rules={[{ required: true, whitespace: true, message: 'Укажите вуз или школу.' }]}>
            <Input variant="underlined" size="large" autoComplete="organization" className={fieldClass} />
          </Form.Item>
          <Form.Item label="Научу" name="give" rules={[{ required: true, whitespace: true, message: 'Напишите хотя бы один навык, которому можете научить.' }]}>
            <Input variant="underlined" size="large" className={fieldClass} />
          </Form.Item>
          <Form.Item label="Хочу научиться" name="want" rules={[{ required: true, whitespace: true, message: 'Напишите, чему хотите научиться.' }]}>
            <Input variant="underlined" size="large" className={fieldClass} />
          </Form.Item>
          <Form.Item
            label="Telegram"
            name="telegram"
            rules={[
              { required: true, whitespace: true, message: 'Оставьте ник в Telegram, туда мы пришлём пару.' },
              { pattern: /^@?[A-Za-z0-9_]{4,32}$/, message: 'Ник в Telegram: латиница, цифры и _, от 4 символов.' },
            ]}
          >
            <Input variant="underlined" size="large" autoComplete="username" placeholder="@username" className={fieldClass} />
          </Form.Item>

          <Button type="primary" size="large" htmlType="submit" block loading={sending}>
            {sending ? 'Отправляем…' : 'Повесить объявление'}
          </Button>
          <p className="mt-4 text-center text-[13px] text-ink-3">Отправляя заявку, вы соглашаетесь на обработку персональных данных.</p>
          <p role="status" className={`text-center text-[15px] font-semibold empty:hidden ${status?.ok ? 'text-ok' : 'text-err'} ${status ? 'mt-3' : ''}`}>
            {status?.text}
          </p>
          <TearTabs label={handle} count={6} />
        </Form>
      </div>
    </section>
  )
}
