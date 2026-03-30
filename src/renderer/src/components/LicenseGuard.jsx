import React from 'react'
import { Result, Button, Typography, Space, Alert } from 'antd'
import { LockOutlined, WifiOutlined, CalendarOutlined, StopOutlined } from '@ant-design/icons'

const { Text } = Typography

const REASON_CONFIG = {
  disabled: {
    icon: <StopOutlined style={{ color: '#ff4d4f' }} />,
    title: 'Suscripción desactivada',
    subTitle: 'Tu suscripción fue desactivada. Contactá al soporte para reactivarla.'
  },
  expired: {
    icon: <CalendarOutlined style={{ color: '#ff4d4f' }} />,
    title: 'Suscripción vencida',
    subTitle: 'Tu período de suscripción ha finalizado. Renovála para continuar.'
  },
  not_found: {
    icon: <LockOutlined style={{ color: '#ff4d4f' }} />,
    title: 'Sin licencia registrada',
    subTitle: 'Este equipo no tiene una licencia activa. Contactá al soporte.'
  },
  grace_exceeded: {
    icon: <WifiOutlined style={{ color: '#ff4d4f' }} />,
    title: 'Sin conexión prolongada',
    subTitle: null
  },
  no_config: {
    icon: <LockOutlined style={{ color: '#faad14' }} />,
    title: 'Configuración incompleta',
    subTitle: 'No se encontró la configuración de licencia. Contactá al soporte.'
  }
}

export function LicenseBlock({ status }) {
  const cfg = REASON_CONFIG[status.reason] || REASON_CONFIG.no_config

  const subTitle = status.reason === 'grace_exceeded'
    ? `Llevás ${status.daysOffline} días sin conexión a internet (límite: ${status.grace} días). Conectate para verificar tu suscripción.`
    : cfg.subTitle

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <Result
        icon={cfg.icon}
        status="error"
        title={cfg.title}
        subTitle={subTitle}
        extra={
          <Space direction="vertical" align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Contacto: soporte@tudominio.com
            </Text>
            <Button onClick={() => window.api.license.check().then(() => window.location.reload())}>
              Reintentar
            </Button>
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
          Sin conexión a internet — verificación pendiente.{' '}
          <strong>{status.daysRemaining} día{status.daysRemaining !== 1 ? 's' : ''}</strong> restante{status.daysRemaining !== 1 ? 's' : ''} de gracia.
        </span>
      }
    />
  )
}
