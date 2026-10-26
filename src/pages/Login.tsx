import { Button, Form, Input } from 'antd'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Pin, vars } from '../components/Paper'
import { useAction } from '../components/AdCard'
import { currentUser, login, useDB } from '../lib/store'
import { safeNext } from '../lib/next'
import { RESET_EMAIL, resetMailto } from '../data'

type Values = { login: string; password: string }

export default function LoginPage() {
  const db = useDB()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [run, busy] = useAction()
  const [form] = Form.useForm<Values>()
  // Re-render when the login changes, so the reset email link carries the current login.
  Form.useWatch('login', form)

  if (db.loaded && currentUser(db)) return <Navigate to={next} replace />

  return (
    <section className="section-y bg-wall" aria-labelledby="login-title">
      <div className="container-page grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[5fr_6fr]">
        <div>
          <h1 className="h2" id="login-title">Вход</h1>
          <p className="lead mt-4">Войдите, чтобы открывать контакты авторов и отмечать свои обмены.</p>
        </div>
        <Form<Values>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={(v) => run(async () => { await login(v.login.trim(), v.password); navigate(next) })}
          className="flyer w-full max-w-[460px] px-5 pt-12 pb-8 sm:px-8 [&_.ant-form-item-label>label]:font-semibold"
          style={vars({ '--tilt': '-0.4deg' })}
        >
          <Pin />
          <Form.Item label="Логин" name="login" rules={[{ required: true, whitespace: true, message: 'Введите логин.' }]}>
            <Input variant="underlined" size="large" autoComplete="username" autoCapitalize="none" className="border-dashed px-0 text-lg font-medium focus:border-solid" />
          </Form.Item>
          <Form.Item label="Пароль" name="password" rules={[{ required: true, message: 'Введите пароль.' }]}>
            <Input.Password variant="underlined" size="large" autoComplete="current-password" className="px-0 [&_input]:text-lg" />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" block loading={busy}>
            Войти
          </Button>
          <p className="mt-4 text-center text-ink-2">
            Нет аккаунта? <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-3">Зарегистрироваться</Link>
          </p>
          <p className="mt-2 text-center text-sm text-ink-3">
            Забыли пароль? Напишите на{' '}
            <a href={resetMailto(form.getFieldValue('login') ?? '')} className="underline underline-offset-3">{RESET_EMAIL}</a>
            {' '}— укажите логин и Telegram, пришлём временный пароль.
          </p>
        </Form>
      </div>
    </section>
  )
}
