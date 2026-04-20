import React, { useState } from 'react'
import { Card, Typography, Form, Input, Button, Alert } from 'antd'
import { MailOutlined, UserOutlined, ShopOutlined, PhoneOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography

export default function SolicitarDemo() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const onFinish = async (values) => {
    setLoading(true)
    setErr('')
    try {
      if (!window.api?.demoOnboarding?.submit) {
        setErr(t('demoOnboarding.noApi'))
        return
      }
      const res = await window.api.demoOnboarding.submit({
        contact_email: values.contact_email,
        contact_name: values.contact_name,
        business_name: values.business_name,
        contact_phone: values.contact_phone,
        notes: values.notes
      })
      if (res?.ok) setDone(true)
      else setErr(res?.error || t('demoOnboarding.errorGeneric'))
    } catch (e) {
      setErr(e?.message || String(e))
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
        justifyContent: 'center',
        padding: 16
      }}
    >
      <Card style={{ width: 440, maxWidth: '100%', borderRadius: 16 }}>
        <Title level={3} style={{ textAlign: 'center' }}>
          {t('demoOnboarding.title')}
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 20 }}>
          {t('demoOnboarding.subtitle')}
        </Text>

        {done ? (
          <Alert
            type="success"
            showIcon
            message={t('demoOnboarding.successTitle')}
            description={t('demoOnboarding.successDesc')}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Form layout="vertical" onFinish={onFinish}>
            {err ? <Alert type="error" message={err} showIcon style={{ marginBottom: 12 }} /> : null}
            <Form.Item
              name="contact_email"
              label={t('demoOnboarding.fieldEmail')}
              rules={[{ required: true, type: 'email', message: t('demoOnboarding.emailInvalid') }]}
            >
              <Input prefix={<MailOutlined />} autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="contact_name"
              label={t('demoOnboarding.fieldName')}
              rules={[{ required: true, message: t('demoOnboarding.nameRequired') }]}
            >
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="business_name" label={t('demoOnboarding.fieldBusiness')}>
              <Input prefix={<ShopOutlined />} />
            </Form.Item>
            <Form.Item name="contact_phone" label={t('demoOnboarding.fieldPhone')}>
              <Input prefix={<PhoneOutlined />} />
            </Form.Item>
            <Form.Item name="notes" label={t('demoOnboarding.fieldNotes')}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              {t('demoOnboarding.submit')}
            </Button>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login">{done ? t('demoOnboarding.goLogin') : t('demoOnboarding.backLogin')}</Link>
        </div>
      </Card>
    </div>
  )
}
