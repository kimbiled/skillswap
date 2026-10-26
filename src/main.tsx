import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntApp, ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { StyleProvider } from '@ant-design/cssinjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import '@fontsource-variable/inter'
import './index.css'
import { theme } from './theme'
import App from './App'

dayjs.locale('ru')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider theme={theme} locale={ruRU}>
        {/* AntApp provides message/modal context for App.useApp() */}
        <AntApp>
          <App />
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)
