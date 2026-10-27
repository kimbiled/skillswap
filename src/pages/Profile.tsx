import { useMemo } from 'react'
import { App, Button, Form, Input, Spin } from 'antd'
import { Link, Navigate } from 'react-router'
import { Pin, vars } from '../components/Paper'
import { formatPhone, useAction } from '../components/AdCard'
import ProfileFields from '../components/ProfileFields'
import { PASSWORD_MIN } from '../../shared/rules'
import { changePassword, currentUser, setAdHidden, updateProfile, useDB, type ProfileInput, type User } from '../lib/store'

type PasswordValues = { current: string; next: string; next2: string }

function PasswordForm() {
  const [form] = Form.useForm<PasswordValues>()
  const [run, busy] = useAction()
  return (
    <Form<PasswordValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      onFinish={(v) => run(async () => { await changePassword(v.current, v.next); form.resetFields() }, 'Пароль изменён. На других устройствах нужно войти заново.')}
      className="flyer w-full max-w-[560px] px-5 pt-12 pb-8 sm:px-8 [&_.ant-form-item-label>label]:font-semibold"
      style={vars({ '--tilt': '-0.3deg' })}
    >
      <Pin />
      <h2 className="h3 mb-4">Сменить пароль</h2>
      <Form.Item label="Текущий пароль" name="current" rules={[{ required: true, message: 'Введите текущий пароль.' }]}>
        <Input.Password variant="underlined" size="large" autoComplete="current-password" className="px-0 [&_input]:text-lg" />
      </Form.Item>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <Form.Item label="Новый пароль" name="next" rules={[{ required: true, message: 'Придумайте пароль.' }, { min: PASSWORD_MIN, message: `Не короче ${PASSWORD_MIN} символов.` }]}>
          <Input.Password variant="underlined" size="large" autoComplete="new-password" className="px-0 [&_input]:text-lg" />
        </Form.Item>
        <Form.Item
          label="Ещё раз"
          name="next2"
          dependencies={['next']}
          rules={[
            { required: true, message: 'Повторите пароль.' },
            ({ getFieldValue }) => ({
              validator: (_, v) => (!v || v === getFieldValue('next') ? Promise.resolve() : Promise.reject(new Error('Пароли не совпадают.'))),
            }),
          ]}
        >
          <Input.Password variant="underlined" size="large" autoComplete="new-password" className="px-0 [&_input]:text-lg" />
        </Form.Item>
      </div>
      <Button htmlType="submit" size="large" loading={busy}>Сменить пароль</Button>
    </Form>
  )
}

function AdVisibility({ me }: { me: User }) {
  const { modal } = App.useApp()
  const [run, busy] = useAction()

  const remove = () =>
    modal.confirm({
      title: 'Удалить объявление с доски?',
      content: 'Его перестанут видеть другие участники. Аккаунт, Skill Coins, обмены и отзывы останутся, а объявление можно вернуть в любой момент.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: () => run(() => setAdHidden(true), 'Объявление удалено с доски.'),
    })

  return (
    <div className="flyer w-full max-w-[560px] px-5 pt-12 pb-8 sm:px-8" style={vars({ '--tilt': '0.2deg' })}>
      <Pin />
      <h2 className="h3">Объявление на доске</h2>
      {me.hidden ? (
        <>
          <p className="mt-2 text-ink-2">Сейчас ваше объявление скрыто: его никто не видит, и новые ученики не могут открыть ваши контакты.</p>
          <Button type="primary" size="large" className="mt-5" loading={busy} onClick={() => run(() => setAdHidden(false), 'Объявление снова на доске.')}>
            Вернуть на доску
          </Button>
        </>
      ) : (
        <>
          <p className="mt-2 text-ink-2">Объявление видно всем на доске. Если вы больше не хотите получать заявки, удалите его.</p>
          <Button danger size="large" className="mt-5" loading={busy} onClick={remove}>
            Удалить объявление
          </Button>
        </>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const db = useDB()
  const me = currentUser(db)
  const [form] = Form.useForm<ProfileInput>()
  const [run, busy] = useAction()

  // Filled once per account: re-filling on every state refresh would wipe edits in progress.
  const initial = useMemo(
    () =>
      me && {
        firstName: me.firstName,
        lastName: me.lastName,
        age: me.age,
        university: me.university,
        telegram: me.telegram ? `@${me.telegram}` : '',
        whatsapp: me.whatsapp ? formatPhone(me.whatsapp) : '',
        teach: me.teach,
        learn: me.learn,
        about: me.about ?? '',
        // Someone under 18 already confirmed this at registration.
        parentConsent: me.age < 18,
      },
    [me?.id], // eslint-disable-line react-hooks/exhaustive-deps
  )

  if (!db.loaded) return <div className="grid min-h-[50vh] place-items-center"><Spin size="large" /></div>
  if (!me) return <Navigate to="/login?next=/profile" replace />

  const save = (v: ProfileInput) =>
    run(() => updateProfile({ ...v, firstName: v.firstName.trim(), lastName: v.lastName.trim(), university: v.university.trim() }), me.hidden ? 'Профиль сохранён.' : 'Профиль сохранён. Изменения уже на доске.')

  return (
    <section className="section-y bg-wall pt-[clamp(40px,6vw,72px)]" aria-labelledby="profile-title">
      <div className="container-page grid items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[5fr_6fr]">
        <div className="lg:sticky lg:top-24">
          <h1 className="h2" id="profile-title">Мой профиль</h1>
          <p className="lead mt-4">
            Добавьте навыки, поменяйте контакты или описание. Изменения сразу появятся в вашем объявлении и в рекомендациях на доске.
          </p>
          <p className="mt-6 text-ink-2">
            Логин: <span className="font-semibold text-ink">{me.login}</span> — его поменять нельзя.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/board" className="text-ink underline underline-offset-3">Открыть доску</Link>
            <Link to="/me" className="text-ink underline underline-offset-3">Мои обмены</Link>
          </div>
        </div>

        <div className="grid gap-10">
          <Form<ProfileInput>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={initial ?? undefined}
            onFinish={save}
            scrollToFirstError={{ block: 'center' }}
            className="flyer w-full max-w-[560px] px-5 pt-10 pb-8 sm:px-8 [&_.ant-form-item-label>label]:font-semibold"
            style={vars({ '--tilt': '0.4deg' })}
          >
            <Pin />
            <ProfileFields form={form} first />
            <Button type="primary" size="large" htmlType="submit" block loading={busy}>
              Сохранить изменения
            </Button>
          </Form>

          <AdVisibility me={me} />
          <PasswordForm />
        </div>
      </div>
    </section>
  )
}
