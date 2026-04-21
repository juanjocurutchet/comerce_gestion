import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useClientStore } from '../store/clientStore'
import { useLicenseStore } from '../store/licenseStore'
import { looksLikeEmail } from '../pwa/pwaEnv.js'
import { isLikelyNetworkFailure } from '@shared/web-license.js'
import { buildCloudUser, persistPrimaryCommerceId } from '../pwa/cloudSessionShared.js'
import { writeCloudUserSnapshot } from '../pwa/cloudAuthSnapshot.js'

const { Title, Text } = Typography

const LoginSimple = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const loadClient = useClientStore((s) => s.load)
  const checkLicense = useLicenseStore((s) => s.check)
  const navigate = useNavigate()

  const mapCloudAuthError = (err) => {
    const raw = String(err || '').toLowerCase()
    if (raw.includes('invalid login') || raw.includes('invalid_grant') || raw.includes('invalid credentials')) {
      return t('login.cloudLoginRejected')
    }
    return String(err || '').trim() || t('login.invalidCredentials')
  }

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      if (!window.api?.usuarios?.login) {
        message.error(t('login.apiNotReady'))
        return
      }
      const u = String(values.username ?? '').trim()
      const p = String(values.password ?? '').trim()
      const pwa = typeof window !== 'undefined' && window.__IS_PWA__
      const cloudAuthAvailable = Boolean(window.api?.cloudAuth?.signIn)
      const cloudEnabled = pwa && cloudAuthAvailable
      let res = null

      if (pwa && looksLikeEmail(u) && !cloudAuthAvailable) {
        message.error(t('login.cloudUnavailable'))
        return
      }

      if (cloudEnabled) {
        if (!looksLikeEmail(u)) {
          message.error(t('login.emailRequired'))
          return
        }
        const cloud = await window.api.cloudAuth.signIn(u, p)
        if (!cloud?.ok) {
          const errRaw = String(cloud?.error || '')
          if (isLikelyNetworkFailure(null, errRaw)) {
            message.error(t('login.offlineSignInFailed'))
          } else {
            message.error(mapCloudAuthError(cloud?.error))
          }
          return
        }
        const sessionWrap = await window.api.cloudAuth.getSession()
        const inner = sessionWrap?.ok ? sessionWrap.data : null
        const sessUser = inner?.session?.user || null
        const membershipsResp = await window.api.cloudAuth.getMemberships()
        const memberships =
          membershipsResp?.ok && Array.isArray(membershipsResp.data) ? membershipsResp.data : []
        const licenseAdminRpc = await window.api.cloudAuth.isLicenseAdminFromJwt?.()
        const built = buildCloudUser({ sessionUser: sessUser, memberships, licenseAdminRpc })
        if (!built.ok) {
          try {
            await window.api.cloudAuth.signOut()
          } catch {
            void 0
          }
          alert(t('login.noCommerceAssigned'))
          return
        }
        await persistPrimaryCommerceId(memberships)
        if (sessUser?.id) writeCloudUserSnapshot(sessUser.id, built.cloudUser)
        res = { ok: true, data: built.cloudUser }
      } else {
        res = await window.api.usuarios.login(u, p)
      }

      if (res?.ok && res.data) {
        const source = res.data?.authSource || 'local'
        setUser({ ...res.data, authSource: source })
        await loadClient()
        await checkLicense()
        navigate('/dashboard')
      } else {
        message.error(res?.error || t('login.invalidCredentials'))
      }
    } catch (error) {
      message.error(`${t('login.internalError', { error: error?.message || error })}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Card style={{ width: 380, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Nexo Commerce</Title>
          <p>Sistema de Gestión Comercial</p>
        </div>

        <Form
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ username: '', password: '' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Ingrese usuario o email' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingrese contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" autoComplete="current-password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Ingresar
            </Button>
          </Form.Item>
        </Form>

        {typeof window !== 'undefined' && window.__IS_PWA__ ? (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
            {t('login.cloudHint')}
          </Text>
        ) : (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
            {t('login.defaultHint')}
          </Text>
        )}
      </Card>
    </div>
  )
}

export default LoginSimple
