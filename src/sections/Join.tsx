import { Button, Checkbox, Form, Input, Spin } from 'antd'
import { Link, useNavigate } from 'react-router'
import { Pin, vars } from '../components/Paper'
import { useAction } from '../components/AdCard'
import ProfileFields, { fieldClass, mustBeChecked } from '../components/ProfileFields'
import { CONTACT_EMAIL } from '../data'
import { LOGIN_RE, PASSWORD_MIN } from '../../shared/rules'
import { currentUser, register, useDB, type RegisterInput } from '../lib/store'

type FormValues = Omit<RegisterInput, 'privacyConsent'> & { password2: string; privacyConsent?: boolean }

type Props = {
  /** Prefill from the hero flyer. */
  initialTeach?: string
  initialLearn?: string
  /** Where to go after registering. */
  next?: string
  title?: string
}

const tags = (s?: string) => (s?.trim() ? [s.trim()] : [])

function RegisterForm({ initialTeach, initialLearn, next = '/board' }: Props) {
  const [form] = Form.useForm<FormValues>()
  const navigate = useNavigate()
  const [run, busy] = useAction()

  const onFinish = ({ password2: _repeat, ...v }: FormValues) =>
    run(async () => {
      await register({
        ...v,
        login: v.login.trim().toLowerCase(),
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        university: v.university.trim(),
        privacyConsent: v.privacyConsent === true,
      })
      navigate(next)
    }, 'Готово! Ваше объявление на доске.')

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      onFinish={onFinish}
      initialValues={{ teach: tags(initialTeach), learn: tags(initialLearn) }}
      scrollToFirstError={{ block: 'center' }}
      className="flyer w-full max-w-[560px] px-5 pt-12 pb-8 sm:px-8 [&_.ant-form-item-label>label]:font-semibold"
      style={vars({ '--tilt': '0.4deg' })}
    >
      <Pin />
      <p className="mb-4 text-sm font-semibold text-ink-3">Вход в аккаунт</p>
      <Form.Item
        label="Логин"
        name="login"
        extra="Латиница, цифры, точка и _. Его видите только вы."
        rules={[
          { required: true, whitespace: true, message: 'Придумайте логин.' },
          { validator: (_, v: string) => (!v || LOGIN_RE.test(v.trim().toLowerCase()) ? Promise.resolve() : Promise.reject(new Error('Латиница, цифры, точка и _, от 3 символов.'))) },
        ]}
      >
        <Input variant="underlined" size="large" autoComplete="username" autoCapitalize="none" className={fieldClass} />
      </Form.Item>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Form.Item label="Пароль" name="password" rules={[{ required: true, message: 'Придумайте пароль.' }, { min: PASSWORD_MIN, message: `Не короче ${PASSWORD_MIN} символов.` }]}>
          <Input.Password variant="underlined" size="large" autoComplete="new-password" className="px-0 [&_input]:text-lg" />
        </Form.Item>
        <Form.Item
          label="Пароль ещё раз"
          name="password2"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Повторите пароль.' },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || v === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Пароли не совпадают.'))),
            }),
          ]}
        >
          <Input.Password variant="underlined" size="large" autoComplete="new-password" className="px-0 [&_input]:text-lg" />
        </Form.Item>
      </div>

      <ProfileFields form={form} />

      <Form.Item name="privacyConsent" valuePropName="checked" rules={[mustBeChecked('Без согласия мы не можем сохранить анкету.')]}>
        <Checkbox>Согласен на обработку персональных данных</Checkbox>
      </Form.Item>

      <Button type="primary" size="large" htmlType="submit" block loading={busy}>
        Повесить объявление
      </Button>
      <p className="mt-4 text-center text-ink-2">
        Уже есть аккаунт? <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-3">Войти</Link>
      </p>
    </Form>
  )
}

export default function Join({ title = 'Повесьте своё объявление', ...props }: Props) {
  const db = useDB()
  const me = currentUser(db)
  const navigate = useNavigate()

  return (
    <section className="section-y bg-wall" id="join" aria-labelledby="join-title">
      <div className="container-page grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[5fr_6fr]">
        <div>
          <h2 className="h2" id="join-title">{title}</h2>
          <p className="lead mt-4">
            После регистрации ваше объявление появится на доске, а вы сможете открывать контакты других авторов.
          </p>
          <p className="mt-6 text-ink-2">
            Вопросы:{' '}
            <a className="text-ink underline underline-offset-3 hover:decoration-2" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        {!db.loaded ? (
          <div className="grid min-h-60 place-items-center"><Spin /></div>
        ) : me ? (
          <div className="flyer max-w-[560px] px-8 pt-12 pb-8" style={vars({ '--tilt': '0.4deg' })}>
            <Pin />
            <p className="h3">{me.firstName}, ваше объявление уже висит</p>
            <p className="mt-2 text-ink-2">Научу: {me.teach.join(', ')}. Хочу: {me.learn.join(', ')}.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="primary" onClick={() => navigate('/board')}>Открыть доску</Button>
              <Button onClick={() => navigate('/profile')}>Изменить профиль</Button>
              <Button onClick={() => navigate('/me')}>Мои обмены</Button>
            </div>
          </div>
        ) : (
          <RegisterForm {...props} />
        )}
      </div>
    </section>
  )
}
