import React, { useState } from 'react'
import { Card, Tabs, Space, Typography, Button, Tooltip, theme } from 'antd'
import { ShoppingCartOutlined, SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import POS from '../components/VentasPOS'
import HistorialVentas from '../components/VentasHistorial'

const { Title } = Typography

const KBD = ({ children }) => {
  const { token } = theme.useToken()
  return (
    <kbd style={{
      background: token.colorFillSecondary,
      border: `1px solid ${token.colorBorder}`,
      borderBottom: `2px solid ${token.colorBorderSecondary}`,
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 13,
      fontFamily: 'monospace',
      fontWeight: 700,
      color: token.colorText,
      lineHeight: 1.4
    }}>{children}</kbd>
  )
}

const Ventas = () => {
  const [activeTab, setActiveTab] = useState('pos')
  const [refreshKey, setRefreshKey] = useState(0)
  const [priceCheckTrigger, setPriceCheckTrigger] = useState(0)
  const { t } = useTranslation()

  const tabItems = [
    {
      key: 'pos',
      label: <Space><ShoppingCartOutlined />{t('ventas.tabPOS')}</Space>,
      children: <POS
        onVentaCreada={() => setRefreshKey(k => k + 1)}
        active={activeTab === 'pos'}
        priceCheckTrigger={priceCheckTrigger}
      />
    },
    {
      key: 'historial',
      label: t('ventas.tabHistory'),
      children: <HistorialVentas key={refreshKey} />
    }
  ]

  const shortcuts = [
    { key: 'F2', label: t('ventas.shortcutClear') },
    { key: 'F3', label: t('ventas.shortcutPriceCheck') },
    { key: 'F8', label: t('ventas.shortcutDiscount') },
    { key: 'F9', label: t('ventas.shortcutConfirm') },
    { key: '↑↓', label: t('ventas.shortcutNavigate') },
    { key: '+/-', label: t('ventas.shortcutQty') },
    { key: 'Del', label: t('ventas.shortcutDelete') },
  ]

  const { token } = theme.useToken()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Title level={4} style={{ margin: 0, flexShrink: 0 }}>{t('ventas.title')}</Title>
        {activeTab === 'pos' && (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {shortcuts.map(s => (
              <span key={s.key} style={{ fontSize: 13, color: token.colorTextSecondary, display: 'flex', gap: 6, alignItems: 'center' }}>
                <KBD>{s.key}</KBD>{s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <Card
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs
            className="pos-tabs"
            items={tabItems}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
          {activeTab === 'pos' && (
            <Tooltip title="F3">
              <Button
                icon={<SearchOutlined />}
                onClick={() => setPriceCheckTrigger(n => n + 1)}
                style={{ position: 'absolute', top: 6, right: 'calc(41.67% + 28px)' }}
              >
                {t('ventas.priceCheckTitle')}
              </Button>
            </Tooltip>
          )}
        </div>
      </Card>
    </div>
  )
}

export default Ventas
