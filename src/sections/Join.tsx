import { Button, Checkbox, Form, Input, InputNumber, Select, Spin } from 'antd'
import { Link, useNavigate } from 'react-router'
import { Pin, vars } from '../components/Paper'
import { useAction } from '../components/AdCard'
import { skillOptions } from '../data'
import { LOGIN_RE, PASSWORD_MIN, TELEGRAM_RE, isPhone } from '../../shared/rules'
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

const fieldClass = 'border-dashed px-0 text-lg font-medium focus:border-solid'
const tags = (s?: string) => (s?.trim() ? [s.trim()] : [])
const options = skillOptions.map((s) => ({ value: s, label: s }))
const mustBeChecked = (msg: string) => ({
  validator: (_: unknown, v: unknown) => (v ? Promise.resolve() : Promise.reject(new Error(msg))),
})

function RegisterForm({ initialTeach, initialLearn, next = '/board' }: Props) {
  const [form] = Form.useForm<FormValues>()
  const navigate = useNavigate()
  const [run, busy] = useAction()
  const age = Form.useWatch('age', form)

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

      <p className="mt-2 mb-4 border-t border-rule pt-6 text-sm font-semibold text-ink-3">Объявление</p>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Form.Item label="Фамилия" name="lastName" rules={[{ required: true, whitespace: true, message: 'Укажите фамилию.' }]}>
          <Input variant="underlined" size="large" autoComplete="family-name" className={fieldClass} />
        </Form.Item>
        <Form.Item label="Имя" name="firstName" rules={[{ required: true, whitespace: true, message: 'Укажите имя.' }]}>
          <Input variant="underlined" size="large" autoComplete="given-name" className={fieldClass} />
        </Form.Item>
      </div>
      <div className="grid gap-x-6 sm:grid-cols-[120px_1fr]">
        <Form.Item label="Возраст" name="age" rules={[{ required: true, message: 'Укажите возраст.' }, { type: 'number', min: 14, max: 35, message: 'От 14 до 35 лет.' }]}>
          <InputNumber variant="underlined" size="large" min={14} max={35} controls={false} className="w-full [&_input]:px-0 [&_input]:text-lg" />
        </Form.Item>
        <Form.Item label="Вуз или школа" name="university" rules={[{ required: true, whitespace: true, message: 'Укажите вуз или школу.' }]}>
          <Input variant="underlined" size="large" autoComplete="organization" className={fieldClass} />
        </Form.Item>
      </div>

      <p className="mt-2 mb-1 border-t border-rule pt-6 text-sm font-semibold text-ink-3">Контакты</p>
      <p className="mb-4 text-sm text-ink-3">Их увидят только те, кто войдёт в аккаунт и откроет ваше объявление.</p>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Form.Item
          label="Telegram"
          name="telegram"
          rules={[
            { required: true, whitespace: true, message: 'Укажите ник в Telegram.' },
            { pattern: TELEGRAM_RE, message: 'Латиница, цифры и _, от 5 символов.' },
          ]}
        >
          <Input variant="underlined" size="large" placeholder="@username" autoCapitalize="none" className={fieldClass} />
        </Form.Item>
        <Form.Item
          label="WhatsApp"
          name="whatsapp"
          rules={[
            { required: true, whitespace: true, message: 'Укажите номер WhatsApp.' },
            { validator: (_, v: string) => (!v || isPhone(v) ? Promise.resolve() : Promise.reject(new Error('Например, +7 701 123 45 67.'))) },
          ]}
        >
          <Input variant="underlined" size="large" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 701 123 45 67" className={fieldClass} />
        </Form.Item>
      </div>

      <Form.Item label="Научу" name="teach" rules={[{ required: true, type: 'array', min: 1, message: 'Добавьте хотя бы один навык.' }]}>
        <Select mode="tags" size="large" options={options} placeholder="Выберите или впишите свой" tokenSeparators={[',']} maxCount={5} />
      </Form.Item>
      <Form.Item label="Хочу научиться" name="learn" rules={[{ required: true, type: 'array', min: 1, message: 'Добавьте хотя бы один навык.' }]}>
        <Select mode="tags" size="large" options={options} placeholder="Выберите или впишите свой" tokenSeparators={[',']} maxCount={5} />
      </Form.Item>
      <Form.Item label="Пара слов о себе" name="about">
        <Input.TextArea rows={2} maxLength={160} showCount placeholder="Например: объясняю с нуля, удобно по вечерам" />
      </Form.Item>

      {typeof age === 'number' && age < 18 && (
        <Form.Item name="parentConsent" valuePropName="checked" rules={[mustBeChecked('До 18 лет нужно согласие родителей.')]}>
          <Checkbox>Родители знают о регистрации и согласны</Checkbox>
        </Form.Item>
      )}
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
            <a className="text-ink underline underline-offset-3 hover:decoration-2" href="mailto:hello@skillswap.kz">
              hello@skillswap.kz
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
