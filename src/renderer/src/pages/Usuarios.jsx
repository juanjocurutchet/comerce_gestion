import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Modal, Form, Input,
  Select, Switch, Popconfirm, message, Card, Tag, Alert
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

const Usuarios = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [modalPwd, setModalPwd] = useState({ open: false, id: null })
  const [form] = Form.useForm()
  const [formPwd] = Form.useForm()
  const currentUser = useAuthStore(s => s.user)
  const { t } = useTranslation()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const res = await window.api.usuarios.getAll()
    setData(res.data || [])
    setLoading(false)
  }

  const openModal = (record = null) => {
    setModal({ open: true, record })
    if (record) {
      form.setFieldsValue({ ...record, activo: record.activo === 1 })
    } else {
      form.resetFields()
    }
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const payload = { ...values, activo: values.activo ? 1 : 0 }
    const res = modal.record
      ? await window.api.usuarios.update({ ...payload, id: modal.record.id })
      : await window.api.usuarios.create(payload)
    if (res.ok) {
      message.success(modal.record ? t('usuarios.saveSuccess', { action: t('usuarios.saveUpdated') }) : t('usuarios.saveSuccess', { action: t('usuarios.saveCreated') }))
      setModal({ open: false, record: null })
      load()
    } else {
      message.error(res.error || t('common.error'))
    }
  }

  const handleDelete = async (id) => {
    if (id === currentUser?.id) return message.error(t('usuarios.cannotDeleteSelf'))
    const res = await window.api.usuarios.delete(id)
    if (res.ok) { message.success(t('usuarios.deactivateSuccess')); load() }
    else message.error(res.error)
  }

  const handleChangePwd = async () => {
    const values = await formPwd.validateFields()
    const res = await window.api.usuarios.updatePassword(modalPwd.id, values.password)
    if (res.ok) {
      message.success(t('usuarios.changePassword'))
      setModalPwd({ open: false, id: null })
    } else message.error(res.error)
  }

  const columns = [
    { title: t('usuarios.colName'), dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: t('usuarios.colUsername'), dataIndex: 'username' },
    {
      title: t('usuarios.colRole'), dataIndex: 'rol',
      render: v => <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v.toUpperCase()}</Tag>
    },
    {
      title: t('usuarios.colStatus'), dataIndex: 'activo',
      render: v => <Tag color={v ? 'success' : 'error'}>{v ? t('usuarios.statusActive') : t('usuarios.statusInactive')}</Tag>,
      align: 'center'
    },
    { title: t('usuarios.colCreated'), dataIndex: 'created_at', render: v => v?.split(' ')[0] },
    {
      title: t('usuarios.colActions'), key: 'acc', width: 130, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Button size="small" icon={<LockOutlined />} onClick={() => { formPwd.resetFields(); setModalPwd({ open: true, id: r.id }) }} />
          {r.id !== currentUser?.id && (
            <Popconfirm title={t('usuarios.deactivateConfirm')} onConfirm={() => handleDelete(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('usuarios.title')}</Title>
        {currentUser?.rol === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('usuarios.newUser')}</Button>
        )}
      </div>

      {currentUser?.rol !== 'admin' && (
        <Alert message={t('usuarios.adminOnly')} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: total => t('usuarios.pagTotal', { total }) }}
        />
      </Card>

      <Modal
        title={modal.record ? t('usuarios.editUser') : t('usuarios.newUser')}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText={t('common.save')} cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label={t('usuarios.fieldFullName')} rules={[{ required: true }]}>
            <Input placeholder={t('usuarios.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="username" label={t('usuarios.fieldUsername')} rules={[{ required: true }]}>
            <Input placeholder={t('usuarios.usernamePlaceholder')} />
          </Form.Item>
          {!modal.record && (
            <Form.Item name="password" label={t('usuarios.fieldPassword')} rules={[{ required: true, min: 4 }]}>
              <Input.Password placeholder={t('usuarios.passwordPlaceholder')} />
            </Form.Item>
          )}
          <Form.Item name="rol" label={t('usuarios.fieldRole')} initialValue="vendedor" rules={[{ required: true }]}>
            <Select options={[
              { value: 'admin', label: t('usuarios.roles.admin') },
              { value: 'vendedor', label: t('usuarios.roles.vendedor') }
            ]} />
          </Form.Item>
          {modal.record && (
            <Form.Item name="activo" label={t('usuarios.fieldStatus')} valuePropName="checked" initialValue={true}>
              <Switch checkedChildren={t('usuarios.statusActive')} unCheckedChildren={t('usuarios.statusInactive')} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={t('usuarios.changePassword')}
        open={modalPwd.open}
        onOk={handleChangePwd}
        onCancel={() => setModalPwd({ open: false, id: null })}
        okText={t('common.save')} cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={formPwd} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="password" label={t('usuarios.newPassword')} rules={[{ required: true, min: 4 }]}>
            <Input.Password placeholder={t('usuarios.passwordPlaceholder')} />
          </Form.Item>
          <Form.Item name="confirm" label={t('usuarios.fieldConfirm')}
            dependencies={['password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error(t('usuarios.passwordMismatch')))
                }
              })
            ]}
          >
            <Input.Password placeholder={t('usuarios.confirmPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Usuarios
