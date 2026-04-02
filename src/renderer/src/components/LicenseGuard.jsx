import React, { useState } from 'react'
import { Result, Button, Typography, Space, Alert, Input, Form, Card } from 'antd'
import { LockOutlined, WifiOutlined, CalendarOutlined, StopOutlined, KeyOutlined, ShopOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

export function ActivationScreen({ onActivated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form] = Form.useForm()

  async function handleActivate() {
    const { key } = await form.validateFields()
    setLoading(true)
    setError('')
    const res = await window.api.license.activate(key)
    setLoading(false)
    if (res.ok) {
      onActivated()
    } else {
      setError(res.error)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)'
    }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1677ff, #003a8c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShopOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0 }}>Activar aplicación</Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            Ingresá la clave de activación que recibiste para comenzar a usar el sistema.
          </Text>
        </Space>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form form={form} onFinish={handleActivate}>
          <Form.Item name="key" rules={[{ required: true, message: 'Ingresá la clave' }]}>
            <Input
              prefix={<KeyOutlined />}
              placeholder="GCOM-XXXX-XXXX-XXXX"
              size="large"
              style={{ fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}
              onChange={e => form.setFieldValue('key', e.target.value.toUpperCase())}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Activar
          </Button>
        </Form>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          ¿No tenés tu clave? Contactá al soporte.
        </Text>
      </Card>
    </div>
  )
}

const BLOCK_CONFIG = {
  disabled:      { icon: <StopOutlined style={{ color: '#ff4d4f' }} />,    title: 'Suscripción desactivada',   subTitle: 'Tu suscripción fue desactivada. Contactá al soporte para reactivarla.' },
  expired:       { icon: <CalendarOutlined style={{ color: '#ff4d4f' }} />, title: 'Suscripción vencida',       subTitle: 'Tu período de suscripción ha finalizado. Renovála para continuar.' },
  not_found:     { icon: <LockOutlined style={{ color: '#ff4d4f' }} />,     title: 'Clave no válida',           subTitle: 'La clave de activación no fue reconocida. Contactá al soporte.' },
  grace_exceeded:{ icon: <WifiOutlined style={{ color: '#ff4d4f' }} />,     title: 'Sin conexión prolongada',   subTitle: null },
  no_config:     { icon: <LockOutlined style={{ color: '#faad14' }} />,     title: 'Configuración incompleta',  subTitle: 'No se encontró la configuración del servidor. Contactá al soporte.' }
}

export function LicenseBlock({ status, onRetry }) {
  const cfg = BLOCK_CONFIG[status.reason] || BLOCK_CONFIG.no_config
  const subTitle = status.reason === 'grace_exceeded'
    ? `Llevás ${status.daysOffline} días sin conexión (límite: ${status.grace} días). Conectate a internet para verificar tu suscripción.`
    : cfg.subTitle

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <Result
        icon={cfg.icon}
        status="error"
        title={cfg.title}
        subTitle={subTitle}
        extra={
          <Space direction="vertical" align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>Contacto: soporteshangotech@gmail.com</Text>
            <Button onClick={onRetry}>Reintentar</Button>
          </Space>
        }
      />
    </div>
  )
}

export function LicenseWarning({ status }) {
  if (!status?.offline || !status?.valid) return null
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16, borderRadius: 8 }}
      message={
        <span>
          Sin conexión — verificación pendiente.{' '}
          <strong>{status.daysRemaining} día{status.daysRemaining !== 1 ? 's' : ''}</strong> restante{status.daysRemaining !== 1 ? 's' : ''} de gracia.
        </span>
      }
    />
  )
}
