import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { StyleProvider } from '@ant-design/cssinjs'
import '@fontsource-variable/inter'
import './index.css'
import { theme } from './theme'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider theme={theme} locale={ruRU}>
        <App />
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)
