import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antTheme } from 'antd'
import esES from 'antd/locale/es_ES'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import 'dayjs/locale/en'
import relativeTime from 'dayjs/plugin/relativeTime'
import App from './App'
import './styles/global.css'
import './i18n/index.js'
import { useThemeStore } from './store/themeStore'
import { useLanguageStore } from './store/languageStore'
import i18n from './i18n/index.js'

dayjs.locale('es')
dayjs.extend(relativeTime)

function Root() {
  const dark = useThemeStore((s) => s.dark)
  const language = useLanguageStore((s) => s.language)

  useEffect(() => {
    i18n.changeLanguage(language)
    dayjs.locale(language)
  }, [language])

  return (
    <ConfigProvider
      locale={language === 'en' ? enUS : esES}
      theme={{
        algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }
      }}
    >
      <App />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
