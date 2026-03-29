import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal, Form,
  Popconfirm, message, Card
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function Proveedores() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, record: null })
  const [form] = Form.useForm()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await window.api.proveedores.getAll()
    setData(res.data || [])
    setLoading(false)
  }

  function openModal(record = null) {
    setModal({ open: true, record })
    record ? form.setFieldsValue(record) : form.resetFields()
  }

  async function handleSave() {
    const values = await form.validateFields()
    const res = modal.record
      ? await window.api.proveedores.update({ ...values, id: modal.record.id })
      : await window.api.proveedores.create(values)
    if (res.ok) {
      message.success(modal.record ? 'Proveedor actualizado' : 'Proveedor creado')
      setModal({ open: false, record: null })
      load()
    } else {
      message.error(res.error || 'Error al guardar')
    }
  }

  async function handleDelete(id) {
    const res = await window.api.proveedores.delete(id)
    if (res.ok) { message.success('Proveedor eliminado'); load() }
    else message.error(res.error)
  }

  const filtered = data.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.contacto?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: 'Contacto', dataIndex: 'contacto', render: v => v || '-' },
    {
      title: 'Teléfono', dataIndex: 'telefono',
      render: v => v ? <Space><PhoneOutlined />{v}</Space> : '-'
    },
    {
      title: 'Email', dataIndex: 'email',
      render: v => v ? <Space><MailOutlined />{v}</Space> : '-'
    },
    { title: 'Dirección', dataIndex: 'direccion', render: v => v || '-', ellipsis: true },
    {
      title: 'Acciones', key: 'acc', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar este proveedor?" onConfirm={() => handleDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Proveedores</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Nuevo Proveedor</Button>
      </div>

      <Card>
        <Input
          placeholder="Buscar por nombre o contacto..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
          allowClear
        />
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: t => `${t} proveedores` }}
        />
      </Card>

      <Modal
        title={modal.record ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText="Guardar" cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre de la empresa o proveedor" />
          </Form.Item>
          <Form.Item name="contacto" label="Persona de contacto">
            <Input placeholder="Nombre del contacto" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input placeholder="Número de teléfono" prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="email@ejemplo.com" prefix={<MailOutlined />} type="email" />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input placeholder="Dirección del proveedor" />
          </Form.Item>
          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={2} placeholder="Observaciones opcionales" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
