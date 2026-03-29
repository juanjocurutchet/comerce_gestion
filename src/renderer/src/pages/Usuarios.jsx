import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Modal, Form, Input,
  Select, Switch, Popconfirm, message, Card, Tag, Alert
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function Usuarios() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [modalPwd, setModalPwd] = useState({ open: false, id: null })
  const [form] = Form.useForm()
  const [formPwd] = Form.useForm()
  const currentUser = useAuthStore(s => s.user)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await window.api.usuarios.getAll()
    setData(res.data || [])
    setLoading(false)
  }

  function openModal(record = null) {
    setModal({ open: true, record })
    if (record) {
      form.setFieldsValue({ ...record, activo: record.activo === 1 })
    } else {
      form.resetFields()
    }
  }

  async function handleSave() {
    const values = await form.validateFields()
    const payload = { ...values, activo: values.activo ? 1 : 0 }
    const res = modal.record
      ? await window.api.usuarios.update({ ...payload, id: modal.record.id })
      : await window.api.usuarios.create(payload)
    if (res.ok) {
      message.success(modal.record ? 'Usuario actualizado' : 'Usuario creado')
      setModal({ open: false, record: null })
      load()
    } else {
      message.error(res.error || 'Error al guardar')
    }
  }

  async function handleDelete(id) {
    if (id === currentUser?.id) return message.error('No podés eliminar tu propio usuario')
    const res = await window.api.usuarios.delete(id)
    if (res.ok) { message.success('Usuario desactivado'); load() }
    else message.error(res.error)
  }

  async function handleChangePwd() {
    const values = await formPwd.validateFields()
    const res = await window.api.usuarios.updatePassword(modalPwd.id, values.password)
    if (res.ok) {
      message.success('Contraseña actualizada')
      setModalPwd({ open: false, id: null })
    } else message.error(res.error)
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: 'Usuario', dataIndex: 'username' },
    {
      title: 'Rol', dataIndex: 'rol',
      render: v => <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v.toUpperCase()}</Tag>
    },
    {
      title: 'Estado', dataIndex: 'activo',
      render: v => <Tag color={v ? 'success' : 'error'}>{v ? 'Activo' : 'Inactivo'}</Tag>,
      align: 'center'
    },
    { title: 'Creado', dataIndex: 'created_at', render: v => v?.split(' ')[0] },
    {
      title: 'Acciones', key: 'acc', width: 130, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Button size="small" icon={<LockOutlined />} onClick={() => { formPwd.resetFields(); setModalPwd({ open: true, id: r.id }) }} />
          {r.id !== currentUser?.id && (
            <Popconfirm title="¿Desactivar este usuario?" onConfirm={() => handleDelete(r.id)} okText="Sí" cancelText="No">
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
        <Title level={4} style={{ margin: 0 }}>Usuarios</Title>
        {currentUser?.rol === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Nuevo Usuario</Button>
        )}
      </div>

      {currentUser?.rol !== 'admin' && (
        <Alert message="Solo los administradores pueden crear y modificar usuarios." type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: t => `${t} usuarios` }}
        />
      </Card>

      {/* Modal crear/editar */}
      <Modal
        title={modal.record ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText="Guardar" cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true }]}>
            <Input placeholder="Nombre y apellido" />
          </Form.Item>
          <Form.Item name="username" label="Nombre de usuario" rules={[{ required: true }]}>
            <Input placeholder="usuario_ejemplo" />
          </Form.Item>
          {!modal.record && (
            <Form.Item name="password" label="Contraseña" rules={[{ required: true, min: 4 }]}>
              <Input.Password placeholder="Mínimo 4 caracteres" />
            </Form.Item>
          )}
          <Form.Item name="rol" label="Rol" initialValue="vendedor" rules={[{ required: true }]}>
            <Select options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'vendedor', label: 'Vendedor' }
            ]} />
          </Form.Item>
          {modal.record && (
            <Form.Item name="activo" label="Estado" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal cambiar contraseña */}
      <Modal
        title="Cambiar Contraseña"
        open={modalPwd.open}
        onOk={handleChangePwd}
        onCancel={() => setModalPwd({ open: false, id: null })}
        okText="Guardar" cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={formPwd} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="password" label="Nueva Contraseña" rules={[{ required: true, min: 4 }]}>
            <Input.Password placeholder="Mínimo 4 caracteres" />
          </Form.Item>
          <Form.Item name="confirm" label="Confirmar Contraseña"
            dependencies={['password']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('Las contraseñas no coinciden'))
                }
              })
            ]}
          >
            <Input.Password placeholder="Repetir contraseña" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
