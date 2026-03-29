import React, { useEffect, useState, useRef } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal, Form,
  Select, InputNumber, Tag, Popconfirm, message, Row, Col, Card, Tooltip
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  BarcodeOutlined, ScanOutlined
} from '@ant-design/icons'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'

const { Title, Text } = Typography

export default function Productos() {
  const [data, setData] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, record: null })
  const [scanned, setScanned] = useState(false) // feedback visual al escanear
  const [form] = Form.useForm()
  const codigoInputRef = useRef()

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
    setScanned(false)
    if (record) {
      form.setFieldsValue(record)
    } else {
      form.resetFields()
    }
  }

  // Cuando se escanea un código con el modal abierto → autocompleta el campo
  useBarcodeScanner(
    (code) => {
      form.setFieldValue('codigo', code)
      setScanned(true)
      setTimeout(() => setScanned(false), 2000)
      message.success({ content: `Código escaneado: ${code}`, key: 'scan', duration: 2 })
      // Mover foco al campo Nombre si está vacío
      const nombre = form.getFieldValue('nombre')
      if (!nombre) {
        setTimeout(() => {
          document.querySelector('input[id$="_nombre"]')?.focus()
        }, 50)
      }
    },
    { enabled: modal.open, minLength: 3, maxDelay: 50 }
  )

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
    { title: 'Código', dataIndex: 'codigo', width: 140, render: v => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : '-' },
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
        {/* Indicador de lector activo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 6,
          marginBottom: 16,
          background: scanned ? '#f6ffed' : 'rgba(22,119,255,0.06)',
          border: `1px solid ${scanned ? '#b7eb8f' : 'rgba(22,119,255,0.2)'}`,
          transition: 'all 0.3s'
        }}>
          <ScanOutlined style={{ color: scanned ? '#52c41a' : '#1677ff', fontSize: 16 }} />
          <Text style={{ fontSize: 12 }}>
            {scanned
              ? <Text style={{ color: '#52c41a', fontSize: 12 }}>¡Código escaneado! Completá los demás campos.</Text>
              : <Text type="secondary" style={{ fontSize: 12 }}>Lector USB activo — escaneá el código de barras del producto para completar el campo automáticamente.</Text>
            }
          </Text>
        </div>

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                <Input placeholder="Nombre del producto" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="codigo"
                label={
                  <Space size={6}>
                    Código de barras
                    <Tooltip title="Podés escribirlo manualmente o escanearlo con el lector USB">
                      <BarcodeOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Input
                  ref={codigoInputRef}
                  placeholder="Escanear o escribir código..."
                  style={{
                    borderColor: scanned ? '#52c41a' : undefined,
                    transition: 'border-color 0.3s'
                  }}
                  suffix={scanned ? <Tag color="success" style={{ margin: 0 }}>Escaneado</Tag> : null}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoria_id" label="Categoría">
                <Select
                  placeholder="Seleccionar categoría"
                  allowClear
                  options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="proveedor_id" label="Proveedor">
                <Select
                  placeholder="Seleccionar proveedor"
                  allowClear
                  options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                />
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
