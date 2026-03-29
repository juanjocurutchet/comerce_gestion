import React, { useEffect, useState, useRef } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal, Form,
  Select, InputNumber, Tag, Popconfirm, message, Row, Col,
  Card, Tooltip, AutoComplete
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  BarcodeOutlined, ScanOutlined, ExclamationCircleOutlined
} from '@ant-design/icons'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function Productos() {
  const [data, setData] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, record: null })
  const [scanned, setScanned] = useState(false)
  const [nombreSugerencias, setNombreSugerencias] = useState([])
  const [form] = Form.useForm()
  const codigoInputRef = useRef()
  const user = useAuthStore(s => s.user)

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
    setNombreSugerencias([])
    record ? form.setFieldsValue(record) : form.resetFields()
  }

  // ── Autocompletado de nombre ─────────────────────────────────────────────
  function onNombreSearch(text) {
    if (!text || text.length < 2) {
      setNombreSugerencias([])
      return
    }
    const lower = text.toLowerCase()
    const matches = data
      .filter(p => p.nombre?.toLowerCase().includes(lower))
      .slice(0, 8)
      .map(p => ({
        value: p.nombre,
        label: (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>{p.nombre}</span>
            <Space size={4}>
              {p.codigo && <Tag style={{ fontSize: 11 }}>{p.codigo}</Tag>}
              <Tag color={p.stock_actual <= 0 ? 'error' : p.stock_actual <= p.stock_minimo ? 'warning' : 'success'}>
                Stock: {p.stock_actual}
              </Tag>
            </Space>
          </Space>
        ),
        // guardar el producto completo para autocompletar precios si se selecciona
        producto: p
      }))
    setNombreSugerencias(matches)
  }

  // Al seleccionar una sugerencia → preguntar si sumar stock
  function onNombreSelect(value, option) {
    if (option.producto && !modal.record) {
      const p = option.producto
      Modal.confirm({
        title: 'Producto existente',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              El producto <b>"{p.nombre}"</b> ya existe con stock actual de{' '}
              <b>{p.stock_actual} {p.unidad}</b>.
            </p>
            <p style={{ marginTop: 8 }}>
              ¿Querés agregar más stock a este producto en lugar de crear uno nuevo?
            </p>
          </div>
        ),
        okText: 'Sí, sumar stock',
        cancelText: 'No, crear nuevo',
        onOk: () => {
          // Cerrar el modal actual y abrir en modo edición con el duplicado
          setModal({ open: true, record: p })
          form.setFieldsValue(p)
          setNombreSugerencias([])
        },
        onCancel: () => setNombreSugerencias([])
      })
    }
  }

  // ── Lector de código de barras ───────────────────────────────────────────
  useBarcodeScanner(
    (code) => {
      form.setFieldValue('codigo', code)
      setScanned(true)
      setTimeout(() => setScanned(false), 2000)
      message.success({ content: `Código escaneado: ${code}`, key: 'scan', duration: 2 })
      const nombre = form.getFieldValue('nombre')
      if (!nombre) {
        setTimeout(() => document.querySelector('.nombre-autocomplete input')?.focus(), 50)
      }
    },
    { enabled: modal.open, minLength: 3, maxDelay: 50 }
  )

  // ── Guardar ──────────────────────────────────────────────────────────────
  async function handleSave() {
    const values = await form.validateFields()

    // Si es edición, guardar directo
    if (modal.record) {
      const res = await window.api.productos.update({ ...values, id: modal.record.id })
      if (res.ok) {
        message.success('Producto actualizado')
        setModal({ open: false, record: null })
        loadAll()
      } else {
        message.error(res.error || 'Error al guardar')
      }
      return
    }

    // Si es nuevo, verificar duplicados antes de crear
    const dupRes = await window.api.productos.findDuplicate(values.nombre, values.codigo || null)
    const dup = dupRes.data

    if (dup) {
      // Producto duplicado → preguntar qué hacer
      Modal.confirm({
        title: 'Producto existente',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              Ya existe el producto <b>"{dup.nombre}"</b>
              {dup.matchBy === 'codigo' ? ` con el código <b>${dup.codigo}</b>` : ''}.
            </p>
            <p style={{ marginTop: 8 }}>
              Stock actual: <b>{dup.stock_actual} {dup.unidad}</b>
              {values.stock_actual > 0 && (
                <span> → pasaría a <b>{dup.stock_actual + values.stock_actual} {dup.unidad}</b></span>
              )}
            </p>
            <p style={{ marginTop: 8 }}>¿Querés sumarle {values.stock_actual} unidades de stock?</p>
          </div>
        ),
        okText: 'Sí, sumar stock',
        cancelText: 'Cancelar',
        onOk: async () => {
          if (values.stock_actual > 0) {
            const r = await window.api.productos.sumarStock(dup.id, values.stock_actual, user?.id)
            if (r.ok) {
              message.success(`Stock actualizado: ${dup.nombre} ahora tiene ${r.data} ${dup.unidad}`)
              setModal({ open: false, record: null })
              loadAll()
            } else {
              message.error(r.error)
            }
          } else {
            message.info('El stock ingresado es 0, no se realizaron cambios.')
            setModal({ open: false, record: null })
          }
        }
      })
      return
    }

    // Sin duplicados → crear normalmente
    const res = await window.api.productos.create(values, user?.id)
    if (res.ok) {
      message.success('Producto creado')
      if (values.stock_actual > 0) {
        message.info(`Se registró ingreso inicial de ${values.stock_actual} unidades en el historial de stock.`, 3)
      }
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
        {/* Indicador lector USB */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 6, marginBottom: 16,
          background: scanned ? '#f6ffed' : 'rgba(22,119,255,0.06)',
          border: `1px solid ${scanned ? '#b7eb8f' : 'rgba(22,119,255,0.2)'}`,
          transition: 'all 0.3s'
        }}>
          <ScanOutlined style={{ color: scanned ? '#52c41a' : '#1677ff', fontSize: 16 }} />
          <Text style={{ fontSize: 12 }}>
            {scanned
              ? <Text style={{ color: '#52c41a', fontSize: 12 }}>¡Código escaneado! Completá los demás campos.</Text>
              : <Text type="secondary" style={{ fontSize: 12 }}>Lector USB activo — escaneá el producto para completar el código automáticamente.</Text>
            }
          </Text>
        </div>

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                <AutoComplete
                  className="nombre-autocomplete"
                  options={nombreSugerencias}
                  onSearch={onNombreSearch}
                  onSelect={onNombreSelect}
                  popupMatchSelectWidth={400}
                  disabled={!!modal.record}
                >
                  <Input placeholder="Escribí para ver sugerencias..." />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="codigo"
                label={
                  <Space size={6}>
                    Código de barras
                    <Tooltip title="Escribilo manualmente o escanealo con el lector USB">
                      <BarcodeOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Input
                  ref={codigoInputRef}
                  placeholder="Escanear o escribir código..."
                  style={{ borderColor: scanned ? '#52c41a' : undefined, transition: 'border-color 0.3s' }}
                  suffix={scanned ? <Tag color="success" style={{ margin: 0 }}>Escaneado</Tag> : null}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoria_id" label="Categoría">
                <Select placeholder="Seleccionar categoría" allowClear
                  options={categorias.map(c => ({ value: c.id, label: c.nombre }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="proveedor_id" label="Proveedor">
                <Select placeholder="Seleccionar proveedor" allowClear
                  options={proveedores.map(p => ({ value: p.id, label: p.nombre }))} />
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
              <Form.Item
                name="stock_actual"
                label={modal.record ? 'Stock Actual (solo lectura)' : 'Stock Inicial'}
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} disabled={!!modal.record} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stock_minimo" label="Stock Mínimo (alerta)" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          {!modal.record && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              El stock inicial quedará registrado en el historial de movimientos.
            </Text>
          )}
          {modal.record && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Para modificar el stock usá el módulo <b>Stock → Ingreso/Egreso</b>.
            </Text>
          )}
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
