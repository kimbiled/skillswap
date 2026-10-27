import { Checkbox, Form, Input, InputNumber, Select, type FormInstance } from 'antd'
import { skillOptions } from '../data'
import { TELEGRAM_RE, isPhone } from '../../shared/rules'

export const fieldClass = 'border-dashed px-0 text-lg font-medium focus:border-solid'
const options = skillOptions.map((s) => ({ value: s, label: s }))

export const mustBeChecked = (msg: string) => ({
  validator: (_: unknown, v: unknown) => (v ? Promise.resolve() : Promise.reject(new Error(msg))),
})

/**
 * The ad fields shared by registration and "Мой профиль": name, age, school, contacts,
 * skills and a short note. Validation mirrors the server's (api/_lib/validate.ts).
 */
export default function ProfileFields<T>({ form, first = false }: { form: FormInstance<T>; first?: boolean }) {
  const age = Form.useWatch('age' as never, form) as number | undefined

  return (
    <>
      {/* `first`: nothing above in the form, so no divider before the heading */}
      <p className={`mb-4 text-sm font-semibold text-ink-3 ${first ? '' : 'mt-2 border-t border-rule pt-6'}`}>Объявление</p>
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
    </>
  )
}
