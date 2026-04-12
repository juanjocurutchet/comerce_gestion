import React, { useState } from 'react'
import { Card, Tabs, Space, Typography } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import GeneradorPresupuesto from '../components/CotizacionesGenerador'
import HistorialCotizaciones from '../components/CotizacionesHistorial'

const { Title } = Typography

const Cotizaciones = () => {
  const [activeTab, setActiveTab] = useState('nuevo')
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useTranslation()

  const tabItems = [
    {
      key: 'nuevo',
      label: <Space><FileTextOutlined />{t('cotizaciones.tabNew')}</Space>,
      children: <GeneradorPresupuesto onCreado={() => setRefreshKey(k => k + 1)} active={activeTab === 'nuevo'} />
    },
    {
      key: 'historial',
      label: t('cotizaciones.tabHistory'),
      children: <HistorialCotizaciones key={refreshKey} />
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>{t('cotizaciones.title')}</Title>
      </div>
      <Card
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        <Tabs className="pos-tabs" items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </Card>
    </div>
  )
}

export default Cotizaciones
