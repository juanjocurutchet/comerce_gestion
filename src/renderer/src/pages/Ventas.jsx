import React, { useEffect, useState, useRef } from 'react'
import {
  Row, Col, Card, Table, Button, Input, InputNumber, Select,
  Typography, Space, Tag, Divider, Modal, message, Popconfirm, Empty, Tabs
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ShoppingCartOutlined,
  SearchOutlined, CheckOutlined, EyeOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ── Punto de Venta ───────────────────────────────────────────────────────────
function POS({ onVentaCreada }) {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [loading, setLoading] = useState(false)
  const [notas, setNotas] = useState('')
  const user = useAuthStore(s => s.user)
  const searchRef = useRef()

  useEffect(() => { loadProductos() }, [])

  async function loadProductos() {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  async function buscarPorCodigo(codigo) {
    if (!codigo) return
    const res = await window.api.productos.getByCodigo(codigo)
    if (res.ok && res.data) {
      agregarAlCarrito(res.data)
      setBusqueda('')
    } else {
      message.warning('Producto no encontrado')
    }
  }

  function agregarAlCarrito(prod) {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) {
        return prev.map(i => i.producto_id === prod.id
          ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
          : i
        )
      }
      return [...prev, {
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_unitario: prod.precio_venta,
        cantidad: 1,
        subtotal: prod.precio_venta,
        stock: prod.stock_actual
      }]
    })
  }

  function actualizarCantidad(producto_id, cantidad) {
    setCarrito(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario }
        : i
    ).filter(i => i.cantidad > 0))
  }

  function actualizarPrecio(producto_id, precio) {
    setCarrito(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio }
        : i
    ))
  }

  function quitarItem(producto_id) {
    setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
  }

  const subtotal = carrito.reduce((a, i) => a + i.subtotal, 0)
  const totalFinal = Math.max(0, subtotal - descuento)

  async function confirmarVenta() {
    if (carrito.length === 0) return message.warning('El carrito está vacío')
    setLoading(true)
    const venta = { subtotal, descuento, total: totalFinal, metodo_pago: metodoPago, notas }
    const items = carrito.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal
    }))
    const res = await window.api.ventas.create(venta, items, user?.id)
    setLoading(false)
    if (res.ok) {
      message.success(`Venta #${res.data} registrada correctamente`)
      setCarrito([])
      setDescuento(0)
      setNotas('')
      onVentaCreada?.()
    } else {
      message.error(res.error || 'Error al registrar venta')
    }
  }

  const prodFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.includes(busqueda)
  ).slice(0, 30)

  const colsCarrito = [
    { title: 'Producto', dataIndex: 'nombre', ellipsis: true },
    {
      title: 'Precio', dataIndex: 'precio_unitario', width: 110,
      render: (v, r) => (
        <InputNumber
          value={v} min={0} precision={2} size="small" prefix="$"
          onChange={val => actualizarPrecio(r.producto_id, val || 0)}
          style={{ width: 100 }}
        />
      )
    },
    {
      title: 'Cant.', dataIndex: 'cantidad', width: 90,
      render: (v, r) => (
        <InputNumber
          value={v} min={0} size="small"
          onChange={val => actualizarCantidad(r.producto_id, val || 0)}
          style={{ width: 80 }}
        />
      )
    },
    { title: 'Subtotal', dataIndex: 'subtotal', render: v => `$${v.toFixed(2)}`, align: 'right', width: 90 },
    {
      key: 'del', width: 40,
      render: (_, r) => <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => quitarItem(r.producto_id)} />
    }
  ]

  return (
    <Row gutter={16} style={{ height: 'calc(100vh - 180px)' }}>
      {/* Panel izquierdo: productos */}
      <Col span={14}>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { padding: 12, flex: 1, overflow: 'auto' } }}>
          <Input.Search
            ref={searchRef}
            placeholder="Buscar por nombre o escanear código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onSearch={buscarPorCodigo}
            enterButton
            style={{ marginBottom: 12 }}
            autoFocus
          />
          <Row gutter={[8, 8]}>
            {prodFiltrados.map(p => (
              <Col span={6} key={p.id}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => agregarAlCarrito(p)}
                  style={{ cursor: 'pointer', borderRadius: 8 }}
                  styles={{ body: { padding: 8 } }}
                >
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 2 }} ellipsis>{p.nombre}</Text>
                  <Text style={{ color: '#1677ff', fontWeight: 700 }}>${Number(p.precio_venta).toFixed(2)}</Text>
                  <br />
                  <Tag size="small" color={p.stock_actual <= 0 ? 'error' : 'default'} style={{ fontSize: 10, marginTop: 2 }}>
                    Stock: {p.stock_actual}
                  </Tag>
                </Card>
              </Col>
            ))}
            {prodFiltrados.length === 0 && <Col span={24}><Empty description="Sin resultados" /></Col>}
          </Row>
        </Card>
      </Col>

      {/* Panel derecho: carrito */}
      <Col span={10}>
        <Card
          title={<Space><ShoppingCartOutlined />Carrito ({carrito.length})</Space>}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { padding: 12, display: 'flex', flexDirection: 'column', flex: 1 } }}
        >
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
            <Table
              columns={colsCarrito}
              dataSource={carrito}
              rowKey="producto_id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Carrito vacío' }}
            />
          </div>

          <div>
            <Divider style={{ margin: '8px 0' }} />
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Subtotal:</Text>
              <Text>${subtotal.toFixed(2)}</Text>
            </Row>
            <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
              <Text>Descuento:</Text>
              <InputNumber
                value={descuento} min={0} max={subtotal} precision={2} prefix="$"
                onChange={setDescuento} size="small" style={{ width: 110 }}
              />
            </Row>
            <Row justify="space-between" style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 16 }}>TOTAL:</Text>
              <Text strong style={{ fontSize: 20, color: '#1677ff' }}>${totalFinal.toFixed(2)}</Text>
            </Row>
            <Select
              value={metodoPago}
              onChange={setMetodoPago}
              style={{ width: '100%', marginBottom: 8 }}
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'tarjeta_debito', label: 'Tarjeta Débito' },
                { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
                { value: 'transferencia', label: 'Transferencia' },
                { value: 'otro', label: 'Otro' }
              ]}
            />
            <Input
              placeholder="Notas (opcional)"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <Button
              type="primary" icon={<CheckOutlined />} block size="large"
              loading={loading} onClick={confirmarVenta}
              disabled={carrito.length === 0}
            >
              Confirmar Venta
            </Button>
          </div>
        </Card>
      </Col>
    </Row>
  )
}

// ── Historial de Ventas ──────────────────────────────────────────────────────
function HistorialVentas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => { loadVentas() }, [])

  async function loadVentas() {
    setLoading(true)
    const res = await window.api.ventas.getAll()
    setVentas(res.data || [])
    setLoading(false)
  }

  async function verDetalle(venta) {
    const res = await window.api.ventas.getItems(venta.id)
    setItems(res.data || [])
    setDetalle(venta)
  }

  async function anularVenta(id) {
    const res = await window.api.ventas.anular(id)
    if (res.ok) { message.success('Venta anulada'); loadVentas() }
    else message.error(res.error)
  }

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Fecha', dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YY HH:mm'), width: 130 },
    { title: 'Total', dataIndex: 'total', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: 'Pago', dataIndex: 'metodo_pago', render: v => <Tag>{v}</Tag> },
    {
      title: 'Estado', dataIndex: 'estado',
      render: v => <Tag color={v === 'completada' ? 'success' : 'error'}>{v}</Tag>
    },
    { title: 'Vendedor', dataIndex: 'usuario_nombre', render: v => v || '-' },
    {
      key: 'acc', width: 100,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)} />
          {r.estado === 'completada' && (
            <Popconfirm title="¿Anular esta venta?" onConfirm={() => anularVenta(r.id)} okText="Sí" cancelText="No">
              <Button size="small" danger>Anular</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <>
      <Table columns={columns} dataSource={ventas} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 15, showTotal: t => `${t} ventas` }}
      />
      <Modal
        title={`Venta #${detalle?.id}`}
        open={!!detalle}
        onCancel={() => setDetalle(null)}
        footer={<Button onClick={() => setDetalle(null)}>Cerrar</Button>}
        width={500}
      >
        {detalle && (
          <>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}><Text type="secondary">Fecha:</Text><br /><Text>{dayjs(detalle.fecha).format('DD/MM/YYYY HH:mm')}</Text></Col>
              <Col span={12}><Text type="secondary">Método de pago:</Text><br /><Tag>{detalle.metodo_pago}</Tag></Col>
            </Row>
            <Table
              columns={[
                { title: 'Producto', dataIndex: 'producto_nombre' },
                { title: 'Cant.', dataIndex: 'cantidad', align: 'center' },
                { title: 'Precio', dataIndex: 'precio_unitario', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
                { title: 'Subtotal', dataIndex: 'subtotal', render: v => `$${Number(v).toFixed(2)}`, align: 'right' }
              ]}
              dataSource={items} rowKey="id" size="small" pagination={false}
            />
            <Divider />
            <Row justify="space-between"><Text>Subtotal:</Text><Text>${Number(detalle.subtotal).toFixed(2)}</Text></Row>
            {detalle.descuento > 0 && <Row justify="space-between"><Text>Descuento:</Text><Text>-${Number(detalle.descuento).toFixed(2)}</Text></Row>}
            <Row justify="space-between"><Text strong>Total:</Text><Text strong>${Number(detalle.total).toFixed(2)}</Text></Row>
          </>
        )}
      </Modal>
    </>
  )
}

export default function Ventas() {
  const [refreshKey, setRefreshKey] = useState(0)

  const tabItems = [
    { key: 'pos', label: 'Punto de Venta', children: <POS onVentaCreada={() => setRefreshKey(k => k + 1)} /> },
    { key: 'historial', label: 'Historial de Ventas', children: <HistorialVentas key={refreshKey} /> }
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Ventas</Title>
      </div>
      <Card styles={{ body: { padding: '0 16px 16px' } }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
