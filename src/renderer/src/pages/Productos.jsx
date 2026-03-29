import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal, Form,
  Select, InputNumber, Tag, Popconfirm, message, Row, Col, Card
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, BarcodeOutlined } from '@ant-design/icons'

const { Title } = Typography

export default function Productos() {
  const [data, setData] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, record: null })
  const [form] = Form.useForm()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [p, c, pr] = await Promise.all([
      window.api.productos.getAll(),
      window.api.categorias.getAll(),
      window.api.proveedores.getAll()
    ])
    setData(p.data || [])
    setCategorias(c.data || [])
    setProveedores(pr.data || [])
    setLoading(false)
  }

  function openModal(record = null) {
    setModal({ open: true, record })
    if (record) {
      form.setFieldsValue(record)
    } else {
      form.resetFields()
    }
  }

  async function handleSave() {
    const values = await form.validateFields()
    const res = modal.record
      ? await window.api.productos.update({ ...values, id: modal.record.id })
      : await window.api.productos.create(values)
    if (res.ok) {
      message.success(modal.record ? 'Producto actualizado' : 'Producto creado')
      setModal({ open: false, record: null })
      loadAll()
    } else {
      message.error(res.error || 'Error al guardar')
    }
  }

  async function handleDelete(id) {
    const res = await window.api.productos.delete(id)
    if (res.ok) { message.success('Producto eliminado'); loadAll() }
    else message.error(res.error)
  }

  const filtered = data.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria_nombre?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { title: 'Código', dataIndex: 'codigo', width: 110, render: v => v || '-' },
    { title: 'Nombre', dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: 'Categoría', dataIndex: 'categoria_nombre', render: v => v ? <Tag>{v}</Tag> : '-' },
    { title: 'P. Compra', dataIndex: 'precio_compra', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: 'P. Venta', dataIndex: 'precio_venta', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    {
      title: 'Stock', dataIndex: 'stock_actual',
      render: (v, r) => (
        <Tag color={v <= 0 ? 'error' : v <= r.stock_minimo ? 'warning' : 'success'}>
          {v} {r.unidad}
        </Tag>
      ),
      align: 'center'
    },
    { title: 'Proveedor', dataIndex: 'proveedor_nombre', render: v => v || '-' },
    {
      title: 'Acciones', key: 'acciones', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar este producto?" onConfirm={() => handleDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Productos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <Input
          placeholder="Buscar por nombre, código o categoría..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
          allowClear
        />
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} productos` }}
        />
      </Card>

      <Modal
        title={modal.record ? 'Editar Producto' : 'Nuevo Producto'}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Nombre del producto" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="codigo" label="Código / Código de barras">
                <Input placeholder="Ej: 7790001234567" prefix={<BarcodeOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoria_id" label="Categoría">
                <Select placeholder="Seleccionar categoría" allowClear options={categorias.map(c => ({ value: c.id, label: c.nombre }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="proveedor_id" label="Proveedor">
                <Select placeholder="Seleccionar proveedor" allowClear options={proveedores.map(p => ({ value: p.id, label: p.nombre }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="precio_compra" label="Precio Compra" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="precio_venta" label="Precio Venta" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unidad" label="Unidad" initialValue="unidad">
                <Select options={[
                  { value: 'unidad', label: 'Unidad' },
                  { value: 'kg', label: 'Kg' },
                  { value: 'litro', label: 'Litro' },
                  { value: 'metro', label: 'Metro' },
                  { value: 'caja', label: 'Caja' }
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock_actual" label="Stock Actual" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stock_minimo" label="Stock Mínimo (alerta)" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
