import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal, Form,
  Popconfirm, message, Card
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Title } = Typography

const Proveedores = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, record: null })
  const [form] = Form.useForm()
  const { t } = useTranslation()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const res = await window.api.proveedores.getAll()
    setData(res.data || [])
    setLoading(false)
  }

  const openModal = (record = null) => {
    setModal({ open: true, record })
    record ? form.setFieldsValue(record) : form.resetFields()
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const res = modal.record
      ? await window.api.proveedores.update({ ...values, id: modal.record.id })
      : await window.api.proveedores.create(values)
    if (res.ok) {
      message.success(modal.record ? t('proveedores.saveSuccess', { action: t('proveedores.saveUpdated') }) : t('proveedores.saveSuccess', { action: t('proveedores.saveCreated') }))
      setModal({ open: false, record: null })
      load()
    } else {
      message.error(res.error || t('proveedores.saveError'))
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.proveedores.delete(id)
    if (res.ok) { message.success(t('proveedores.deleteSuccess')); load() }
    else message.error(res.error)
  }

  const filtered = data.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.contacto?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { title: t('proveedores.colName'), dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: t('proveedores.colContact'), dataIndex: 'contacto', render: v => v || '-' },
    {
      title: t('proveedores.colPhone'), dataIndex: 'telefono',
      render: v => v ? <Space><PhoneOutlined />{v}</Space> : '-'
    },
    {
      title: t('proveedores.colEmail'), dataIndex: 'email',
      render: v => v ? <Space><MailOutlined />{v}</Space> : '-'
    },
    { title: t('proveedores.colAddress'), dataIndex: 'direccion', render: v => v || '-', ellipsis: true },
    {
      title: t('proveedores.colActions'), key: 'acc', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title={t('proveedores.deleteConfirm')} onConfirm={() => handleDelete(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('proveedores.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('proveedores.newSupplier')}</Button>
      </div>

      <Card>
        <Input
          placeholder={t('proveedores.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
          allowClear
        />
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: total => t('proveedores.pagTotal', { total }) }}
        />
      </Card>

      <Modal
        title={modal.record ? t('proveedores.editSupplier') : t('proveedores.newSupplier')}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText={t('common.save')} cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label={t('proveedores.fieldName')} rules={[{ required: true }]}>
            <Input placeholder={t('proveedores.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="contacto" label={t('proveedores.fieldContact')}>
            <Input placeholder={t('proveedores.contactPlaceholder')} />
          </Form.Item>
          <Form.Item name="telefono" label={t('proveedores.fieldPhone')}>
            <Input placeholder={t('proveedores.phonePlaceholder')} prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="email" label={t('proveedores.fieldEmail')}>
            <Input placeholder={t('proveedores.emailPlaceholder')} prefix={<MailOutlined />} type="email" />
          </Form.Item>
          <Form.Item name="direccion" label={t('proveedores.fieldAddress')}>
            <Input placeholder={t('proveedores.addressPlaceholder')} />
          </Form.Item>
          <Form.Item name="notas" label={t('proveedores.fieldNotes')}>
            <Input.TextArea rows={2} placeholder={t('proveedores.notesPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Proveedores
