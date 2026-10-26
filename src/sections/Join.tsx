import { Button, Checkbox, Form, Input, InputNumber, Select } from 'antd'
import { useNavigate } from 'react-router'
import { Pin, vars } from '../components/Paper'
import { useAction } from '../components/AdCard'
import { skillOptions } from '../data'
import { currentUser, register, useDB, type RegisterInput } from '../lib/store'

type FormValues = RegisterInput & { parentConsent?: boolean; privacyConsent: boolean }

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

function RegisterForm({ initialTeach, initialLearn, next = '/board' }: Props) {
  const [form] = Form.useForm<FormValues>()
  const navigate = useNavigate()
  const run = useAction()
  const age = Form.useWatch('age', form)

  const onFinish = ({ parentConsent: _p, privacyConsent: _c, ...values }: FormValues) => {
    run(() => {
      register({ ...values, firstName: values.firstName.trim(), lastName: values.lastName.trim(), university: values.university.trim() })
      navigate(next)
    }, 'Готово! Ваше объявление на доске.')
  }

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
      <Form.Item
        label="Telegram"
        name="telegram"
        extra="Его увидят только зарегистрированные участники. Телефон не нужен."
        rules={[
          { required: true, whitespace: true, message: 'Оставьте ник в Telegram — через него с вами свяжутся.' },
          { pattern: /^@?[A-Za-z0-9_]{5,32}$/, message: 'Ник в Telegram: латиница, цифры и _, от 5 символов.' },
        ]}
      >
        <Input variant="underlined" size="large" autoComplete="username" placeholder="@username" className={fieldClass} />
      </Form.Item>
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
        <Form.Item
          name="parentConsent"
          valuePropName="checked"
          rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('До 18 лет нужно согласие родителей.'))) }]}
        >
          <Checkbox>Родители знают о регистрации и согласны</Checkbox>
        </Form.Item>
      )}
      <Form.Item
        name="privacyConsent"
        valuePropName="checked"
        rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('Без согласия мы не можем сохранить анкету.'))) }]}
      >
        <Checkbox>Согласен на обработку персональных данных</Checkbox>
      </Form.Item>

      <Button type="primary" size="large" htmlType="submit" block>
        Повесить объявление
      </Button>
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
            После регистрации ваше объявление появится на доске, а вы сможете открывать Telegram других авторов.
          </p>
          <p className="mt-6 text-ink-2">
            Вопросы:{' '}
            <a className="text-ink underline underline-offset-3 hover:decoration-2" href="mailto:hello@skillswap.kz">
              hello@skillswap.kz
            </a>
          </p>
        </div>

        {me ? (
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
