import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space, Tooltip, theme as antTheme } from 'antd'
import { UserOutlined, LockOutlined, ShopOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useLicenseStore } from '../store/licenseStore'
import { useClientStore } from '../store/clientStore'
import { LicenseWarning } from '../components/LicenseGuard'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const { dark, toggle } = useThemeStore()
  const { token } = antTheme.useToken()
  const licenseStatus = useLicenseStore((s) => s.status)
  const { logo, clientName } = useClientStore()

  const onFinish = async ({ username, password }) => {
    setLoading(true)
    setError('')
    const res = await window.api.usuarios.login(username, password)
    setLoading(false)
    if (res.ok && res.data) {
      setUser(res.data)
      navigate('/dashboard')
    } else {
      setError('Usuario o contraseña incorrectos')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: dark
        ? 'linear-gradient(135deg, #0a0a0a 0%, #001529 100%)'
        : 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <Tooltip title={dark ? 'Modo claro' : 'Modo oscuro'}>
          <Button
            type="text"
            onClick={toggle}
            icon={dark
              ? <BulbFilled style={{ fontSize: 20, color: '#faad14' }} />
              : <BulbOutlined style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }} />
            }
          />
        </Tooltip>
      </div>
      <Card style={{ width: 380, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 32 }}>
          {logo ? (
            <img src={logo} alt={clientName} style={{ width: '100%', maxHeight: 80, objectFit: 'contain' }} />
          ) : (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'linear-gradient(135deg, #1677ff, #003a8c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShopOutlined style={{ fontSize: 32, color: '#fff' }} />
              </div>
              <Title level={3} style={{ margin: 0 }}>{clientName || 'Gestión Comercio'}</Title>
            </>
          )}
          <Text type="secondary">Ingresá tus credenciales para continuar</Text>
        </Space>

        <LicenseWarning status={licenseStatus} />
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: 'Ingresá el usuario' }]}>
            <Input prefix={<UserOutlined />} placeholder="Usuario" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Ingresá la contraseña' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Ingresar
            </Button>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          Usuario por defecto: admin / admin123
        </Text>
      </Card>
    </div>
  )
}
