import React, { useState } from 'react'
import { Card, Tabs, Space, Typography } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import POS from '../components/VentasPOS'
import HistorialVentas from '../components/VentasHistorial'

const { Title } = Typography

const Ventas = () => {
  const [activeTab, setActiveTab] = useState('pos')
  const [refreshKey, setRefreshKey] = useState(0)
  const { t } = useTranslation()

  const tabItems = [
    {
      key: 'pos',
      label: <Space><ShoppingCartOutlined />{t('ventas.tabPOS')}</Space>,
      children: <POS onVentaCreada={() => setRefreshKey(k => k + 1)} active={activeTab === 'pos'} />
    },
    {
      key: 'historial',
      label: t('ventas.tabHistory'),
      children: <HistorialVentas key={refreshKey} />
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>{t('ventas.title')}</Title>
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

export default Ventas
