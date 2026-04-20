import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Result, Button, Typography, Space, Alert, Input, Form, Card, Modal, message } from 'antd'
import { LockOutlined, WifiOutlined, CalendarOutlined, StopOutlined, KeyOutlined } from '@ant-design/icons'
import nexoLogo from '../assets/nexo-commerce-logo.png'

const { Text, Title } = Typography

export const ActivationScreen = ({ onActivated }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form] = Form.useForm()

  const handleActivate = async () => {
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
          <img src={nexoLogo} alt="Nexo Commerce" style={{ width: 200, objectFit: 'contain', marginBottom: 4 }} />
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
        {typeof window !== 'undefined' && window.__IS_PWA__ ? (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/login">Ir al inicio de sesión</Link>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 11 }}>
              Si sos administrador (Supabase), podés entrar con email y contraseña sin activar antes.
            </Text>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

const BLOCK_CONFIG = {
  disabled:      { icon: <StopOutlined style={{ color: '#ff4d4f' }} />,    title: 'Suscripción desactivada',   subTitle: 'Tu suscripción fue desactivada. Contactá al soporte para reactivarla.' },
  expired:       { icon: <CalendarOutlined style={{ color: '#ff4d4f' }} />, title: 'Suscripción vencida',       subTitle: 'Tu período de suscripción ha finalizado. Renovála para continuar.' },
  not_found:     { icon: <LockOutlined style={{ color: '#ff4d4f' }} />,     title: 'Clave no válida',           subTitle: 'La clave de activación no fue reconocida. Contactá al soporte.' },
  grace_exceeded:{ icon: <WifiOutlined style={{ color: '#ff4d4f' }} />,     title: 'Sin conexión prolongada',   subTitle: null },
  no_config:     { icon: <LockOutlined style={{ color: '#faad14' }} />,     title: 'Configuración incompleta',  subTitle: 'Faltan variables de entorno en el despliegue (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY). En Vercel: Project → Settings → Environment Variables, agregalas para Production y volvé a desplegar. El .env local no viaja al build.' }
}

export const LicenseBlock = ({ status, onRetry }) => {
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

export const LicenseWarning = ({ status }) => {
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

export const TrialUpgradeModal = ({ status, visible, onClose }) => {
  const [form] = Form.useForm()
  const [sending, setSending] = useState(false)

  const isExpired = status?.daysLeft < 0
  const daysLeft = Number(status?.daysLeft ?? 0)
  const title = useMemo(() => {
    if (isExpired) return 'Tu demo finalizó'
    return `Tu demo vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
  }, [isExpired, daysLeft])

  const submit = async () => {
    const values = await form.validateFields()
    setSending(true)
    const res = await window.api.license.requestUpgrade({
      client_name: values.client_name,
      contact_name: values.contact_name,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone || '',
      commerce_size: values.commerce_size || '',
      current_days_left: daysLeft,
      source: typeof window !== 'undefined' && window.__IS_PWA__ ? 'pwa' : 'desktop'
    })
    setSending(false)
    if (res?.ok) {
      message.success('Solicitud enviada. Te contactamos para activar el plan pago.')
      onClose?.()
      return
    }
    message.error(res?.error || 'No se pudo enviar la solicitud.')
  }

  return (
    <Modal
      open={visible}
      title={title}
      onCancel={onClose}
      onOk={submit}
      okText="Quiero pasar a plan pago"
      confirmLoading={sending}
      cancelText="Más tarde"
      destroyOnHidden
    >
      <Alert
        type={isExpired ? 'error' : 'warning'}
        showIcon
        style={{ marginBottom: 12 }}
        message={isExpired ? 'La demo está vencida' : 'Demo por vencer'}
        description="Completá estos datos para que podamos darte el alta del plan pago sin perder información."
      />
      <Form form={form} layout="vertical">
        <Form.Item name="client_name" label="Nombre del comercio" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="contact_name" label="Nombre del responsable" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="contact_email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="contact_phone" label="Teléfono / WhatsApp">
          <Input />
        </Form.Item>
        <Form.Item name="commerce_size" label="Tamaño estimado (usuarios, sucursales)">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  )
}
