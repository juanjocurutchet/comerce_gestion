import React, { useEffect, useState } from 'react'
import {
  Card, Form, Input, Button, Typography, message, Divider,
  Table, Space, Modal, Popconfirm, Alert, Row, Col
} from 'antd'
import { ShopOutlined, SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, ClearOutlined } from '@ant-design/icons'
import { useClientStore } from '../store/clientStore'

const { Title, Text } = Typography

function GestionCategorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [form] = Form.useForm()

  useEffect(() => { loadCategorias() }, [])

  async function loadCategorias() {
    setLoading(true)
    const res = await window.api.categorias.getAll()
    setCategorias(res.data || [])
    setLoading(false)
  }

  function openModal(record = null) {
    setModal({ open: true, record })
    record ? form.setFieldsValue(record) : form.resetFields()
  }

  async function handleSave() {
    const values = await form.validateFields()
    const res = modal.record
      ? await window.api.categorias.update({ ...values, id: modal.record.id })
      : await window.api.categorias.create(values)
    if (res.ok) {
      message.success(modal.record ? 'Categoría actualizada' : 'Categoría creada')
      setModal({ open: false, record: null })
      loadCategorias()
    } else {
      message.error(res.error || 'Error al guardar')
    }
  }

  async function handleDelete(id) {
    const res = await window.api.categorias.delete(id)
    if (res.ok) { message.success('Categoría eliminada'); loadCategorias() }
    else message.error(res.error || 'No se puede eliminar (puede tener productos asociados)')
  }

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Descripción', dataIndex: 'descripcion', render: v => v || <Text type="secondary">—</Text> },
    {
      title: 'Acciones', key: 'acc', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm
            title="¿Eliminar esta categoría?"
            description="Solo se puede eliminar si no tiene productos asociados."
            onConfirm={() => handleDelete(r.id)}
            okText="Sí" cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Nueva Categoría
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={categorias}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Sin categorías. Creá la primera.' }}
      />
      <Modal
        title={modal.record ? 'Editar Categoría' : 'Nueva Categoría'}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingresá un nombre' }]}>
            <Input placeholder="Ej: Bebidas, Electrónica, Limpieza..." />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function DatosDemoAdmin({ onRefresh }) {
  const [loading, setLoading] = useState({ run: false, clear: false })

  async function cargarDemo() {
    setLoading(l => ({ ...l, run: true }))
    const res = await window.api.seed.run()
    setLoading(l => ({ ...l, run: false }))
    if (res.ok) {
      const { creados, omitidos, categorias, proveedores } = res.data
      message.success(`Demo cargada: ${creados} productos, ${categorias} categorías, ${proveedores} proveedores (${omitidos} ya existían)`)
      onRefresh?.()
    } else {
      message.error(res.error || 'Error al cargar demo')
    }
  }

  async function limpiarDemo() {
    setLoading(l => ({ ...l, clear: true }))
    const res = await window.api.seed.clear()
    setLoading(l => ({ ...l, clear: false }))
    if (res.ok) {
      message.success(`Demo eliminada: ${res.data.eliminados} productos removidos`)
      onRefresh?.()
    } else {
      message.error(res.error || 'Error al limpiar demo')
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Datos de demostración"
        description="Cargá productos, categorías y proveedores de ejemplo para mostrarle el sistema a un cliente. Al limpiar, solo se elimina la data de demo (no afecta datos reales)."
      />
      <Space>
        <Button
          icon={<DatabaseOutlined />}
          type="primary"
          loading={loading.run}
          onClick={cargarDemo}
        >
          Cargar datos demo
        </Button>
        <Popconfirm
          title="¿Limpiar datos de demo?"
          description="Se eliminarán los productos, categorías y proveedores de demostración."
          onConfirm={limpiarDemo}
          okText="Sí, limpiar"
          cancelText="Cancelar"
        >
          <Button icon={<ClearOutlined />} danger loading={loading.clear}>
            Limpiar demo
          </Button>
        </Popconfirm>
      </Space>
    </Space>
  )
}

export default function Configuracion() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [catKey, setCatKey] = useState(0)
  const isAdmin = useClientStore(s => s.isAdmin)

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    const res = await window.api.config.getAll()
    if (res.ok && res.data) form.setFieldsValue(res.data)
  }

  async function handleSave() {
    const values = await form.validateFields()
    setLoading(true)
    const res = await window.api.config.setMany(values)
    setLoading(false)
    if (res.ok) message.success('Configuración guardada')
    else message.error(res.error || 'Error al guardar')
  }

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><ShopOutlined style={{ marginRight: 8 }} />Datos del Comercio</>}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Estos datos aparecen en los tickets de venta.
            </Text>
            <Form form={form} layout="vertical">
              <Form.Item name="nombreComercio" label="Nombre del comercio" rules={[{ required: true }]}>
                <Input placeholder="Ej: Mi Comercio" />
              </Form.Item>
              <Form.Item name="direccion" label="Dirección">
                <Input placeholder="Ej: Av. Corrientes 1234, Buenos Aires" />
              </Form.Item>
              <Form.Item name="telefono" label="Teléfono">
                <Input placeholder="Ej: (011) 4123-4567" />
              </Form.Item>
              <Form.Item name="cuit" label="CUIT">
                <Input placeholder="Ej: 20-12345678-9" />
              </Form.Item>
              <Divider />
              <Form.Item name="ticketFooter" label="Mensaje de pie de ticket">
                <Input placeholder="Ej: Gracias por su compra!" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
                  Guardar Configuración
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {isAdmin && (
            <Card title="Administración — Datos de Demo" style={{ marginTop: 16 }}>
              <DatosDemoAdmin onRefresh={() => setCatKey(k => k + 1)} />
            </Card>
          )}
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Categorías de Productos">
            <GestionCategorias key={catKey} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
