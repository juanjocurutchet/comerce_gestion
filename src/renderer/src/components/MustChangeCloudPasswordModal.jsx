import React, { useState } from 'react'
import { Modal, Form, Input, Button, Alert, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'

/** Obliga a definir contraseña propia tras alta con clave temporal (user_metadata en Supabase). */
const MustChangeCloudPasswordModal = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const open = Boolean(user?.authSource === 'cloud' && user?.mustChangePassword)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const r = await window.api.cloudAuth?.updatePassword?.(values.password)
      if (!r?.ok) {
        message.error(r?.error || t('login.mustChangePasswordError'))
        return
      }
      setUser({ ...user, mustChangePassword: false })
      message.success(t('login.mustChangePasswordOk'))
      form.resetFields()
    } catch (e) {
      message.error(e?.message || t('login.mustChangePasswordError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={t('login.mustChangePasswordTitle')}
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      zIndex={1100}
      width={440}
    >
      <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={t('login.mustChangePasswordAlert')} />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="password"
          label={t('login.mustChangePasswordField')}
          rules={[{ required: true, min: 6, message: t('login.mustChangePasswordMin') }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t('login.mustChangePasswordConfirm')}
          dependencies={['password']}
          rules={[
            { required: true, message: t('login.mustChangePasswordConfirmRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve()
                return Promise.reject(new Error(t('login.mustChangePasswordMismatch')))
              }
            })
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            {t('login.mustChangePasswordSubmit')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default MustChangeCloudPasswordModal
