import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, Space, Tooltip } from 'antd'
import { UserOutlined, LockOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useLicenseStore } from '../store/licenseStore'
import { useClientStore } from '../store/clientStore'
import { LicenseWarning } from '../components/LicenseGuard'
import nexoLogo from '../assets/nexo-commerce-logo.png'

const { Title, Text } = Typography

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const { dark, toggle } = useThemeStore()
  const licenseStatus = useLicenseStore((s) => s.status)
  const { logo, clientName } = useClientStore()
  const { t } = useTranslation()

  const onFinish = async ({ username, password }) => {
    setLoading(true)
    setError('')
    const res = await window.api.usuarios.login(username, password)
    setLoading(false)
    if (res.ok && res.data) {
      setUser(res.data)
      navigate('/dashboard')
    } else if (!res.ok) {
      setError(t('login.internalError', { error: res.error }))
    } else {
      setError(t('login.invalidCredentials'))
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
        <Tooltip title={dark ? t('theme.lightMode') : t('theme.darkMode')}>
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
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 24 }}>
          <img
            src={logo || nexoLogo}
            alt={clientName || 'Nexo Commerce'}
            style={{ width: '100%', maxHeight: 80, objectFit: 'contain' }}
          />
          {clientName && <Title level={4} style={{ margin: 0 }}>{clientName}</Title>}
          <Text type="secondary">{t('login.subtitle')}</Text>
        </Space>

        <LicenseWarning status={licenseStatus} />
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item name="username" rules={[{ required: true, message: t('login.usernameRequired') }]}>
            <Input prefix={<UserOutlined />} placeholder={t('login.username')} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('login.passwordRequired') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('login.password')} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('login.submit')}
            </Button>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12 }}>
          {t('login.defaultHint')}
        </Text>

        <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{t('nav.copyright')}</Text>
        </div>
      </Card>
    </div>
  )
}

export default Login
