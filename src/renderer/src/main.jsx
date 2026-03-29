import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import esES from 'antd/locale/es_ES'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import App from './App'
import './styles/global.css'

dayjs.locale('es')

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    locale={esES}
    theme={{
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      },
      components: {
        Layout: {
          siderBg: '#001529'
        }
      }
    }}
  >
    <App />
  </ConfigProvider>
)
