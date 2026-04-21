import { bootPwaApi } from './src/pwa/bootPwaApi.js'
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antTheme } from 'antd'
import esES from 'antd/locale/es_ES'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import 'dayjs/locale/en'
import relativeTime from 'dayjs/plugin/relativeTime'
import App from './src/App'
import './src/styles/global.css'
import i18n from './src/i18n/index.js'
import { useThemeStore } from './src/store/themeStore'
import { useLanguageStore } from './src/store/languageStore'

if (typeof window !== 'undefined') {
  window.__IS_PWA__ = true
  window.__IS_ELECTRON__ = false
  window.__PWA_INSTALL_PROMPT__ = null
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__PWA_INSTALL_PROMPT__ = e
    window.dispatchEvent(new CustomEvent('gcom:pwa-install-available'))
  })
  window.addEventListener('appinstalled', () => {
    window.__PWA_INSTALL_PROMPT__ = null
    window.dispatchEvent(new CustomEvent('gcom:pwa-installed'))
  })
}

async function initPWA() {
  const originalSetLanguage = useLanguageStore.getState().setLanguage
  useLanguageStore.setState({
    setLanguage: (lang) => {
      originalSetLanguage(lang)
      i18n.changeLanguage(lang)
    }
  })
}

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

async function startApp() {
  await bootPwaApi()
  await initPWA()
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(<Root />)
  setTimeout(() => {
    document.body.classList.add('app-loaded')
  }, 500)
}

startApp().catch(() => {})
