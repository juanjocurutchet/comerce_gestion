import React, { useEffect, useState, useRef } from 'react'
import {
  Row, Col, Card, Table, Button, Input, InputNumber, Select,
  Typography, Space, Tag, Divider, Modal, message, Popconfirm, Empty, Tabs, Badge, Tooltip
} from 'antd'
import {
  DeleteOutlined, ShoppingCartOutlined,
  CheckOutlined, EyeOutlined, BarcodeOutlined, ScanOutlined, PrinterOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import TicketPreview from '../components/TicketPreview'
import dayjs from 'dayjs'

const { Title, Text } = Typography

// ── Punto de Venta ───────────────────────────────────────────────────────────
function POS({ onVentaCreada, active }) {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [tipoDescuento, setTipoDescuento] = useState('$')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [loading, setLoading] = useState(false)
  const [notas, setNotas] = useState('')
  const [lastScanned, setLastScanned] = useState(null)
  const [ticketModal, setTicketModal] = useState({ open: false, venta: null, items: [] })
  const user = useAuthStore(s => s.user)
  const searchRef = useRef()

  useEffect(() => { loadProductos() }, [])

  // Auto-foco al activar la pestaña POS
  useEffect(() => {
    if (active) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [active])

  async function loadProductos() {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  async function buscarPorCodigo(codigo) {
    const code = codigo?.trim()
    if (!code) return
    const res = await window.api.productos.getByCodigo(code)
    if (res.ok && res.data) {
      agregarAlCarrito(res.data)
      setLastScanned({ code, nombre: res.data.nombre, ok: true })
      setBusqueda('')
    } else {
      // Intentar búsqueda por nombre como fallback
      const match = productos.find(p =>
        p.nombre?.toLowerCase().includes(code.toLowerCase()) ||
        p.codigo === code
      )
      if (match) {
        agregarAlCarrito(match)
        setLastScanned({ code, nombre: match.nombre, ok: true })
        setBusqueda('')
      } else {
        setLastScanned({ code, ok: false })
        message.warning({ content: `Código "${code}" no encontrado`, key: 'scan-warn', duration: 2 })
      }
    }
  }

  // Hook global de lector de código de barras
  useBarcodeScanner(
    (code) => buscarPorCodigo(code),
    { enabled: active, minLength: 3, maxDelay: 50 }
  )

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
  const descuentoMonto = tipoDescuento === '%' ? subtotal * (descuento / 100) : descuento
  const totalFinal = Math.max(0, subtotal - descuentoMonto)

  async function confirmarVenta() {
    if (carrito.length === 0) return message.warning('El carrito está vacío')
    setLoading(true)
    const venta = { subtotal, descuento: descuentoMonto, total: totalFinal, metodo_pago: metodoPago, notas }
    const items = carrito.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal
    }))
    const res = await window.api.ventas.create(venta, items, user?.id)
    setLoading(false)
    if (res.ok) {
      const ventaId = res.data
      message.success(`Venta #${ventaId} registrada correctamente`)
      // Armar venta e items para el ticket
      const ventaObj = {
        id: ventaId,
        fecha: new Date().toISOString(),
        subtotal,
        descuento: descuentoMonto,
        total: totalFinal,
        metodo_pago: metodoPago,
        notas,
        usuario_nombre: user?.nombre
      }
      setTicketModal({ open: true, venta: ventaObj, items: carrito.map(i => ({ ...i, producto_nombre: i.nombre })) })
      setCarrito([])
      setDescuento(0)
      setTipoDescuento('$')
      setNotas('')
      setLastScanned(null)
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
    <div style={{ display: 'flex', gap: 12, height: '100%', padding: '8px 16px 16px', overflow: 'hidden' }}>

      {/* ── Panel izquierdo: productos ─────────────────────────── */}
      <Card
        style={{ flex: 14, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {/* Barra de búsqueda — fija */}
        <div style={{ padding: '10px 12px 8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input.Search
              ref={searchRef}
              className="pos-search"
              placeholder="Buscar producto o escanear código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onSearch={buscarPorCodigo}
              enterButton={<><BarcodeOutlined /> Buscar</>}
              style={{ flex: 1 }}
            />
            <Tooltip title="Lector USB activo: apuntá el lector a cualquier código de barras">
              <Tag icon={<ScanOutlined />} color="blue" style={{ cursor: 'help', userSelect: 'none', padding: '4px 8px' }}>
                Lector USB
              </Tag>
            </Tooltip>
          </div>

          {lastScanned && (
            <div style={{
              marginTop: 6,
              padding: '4px 10px',
              borderRadius: 6,
              background: lastScanned.ok ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${lastScanned.ok ? '#b7eb8f' : '#ffccc7'}`,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12
            }}>
              <BarcodeOutlined style={{ color: lastScanned.ok ? '#52c41a' : '#ff4d4f' }} />
              <Text style={{ fontSize: 12 }}>
                <Text code style={{ fontSize: 11 }}>{lastScanned.code}</Text>
                {lastScanned.ok
                  ? <Text style={{ color: '#52c41a', marginLeft: 6 }}>→ {lastScanned.nombre} agregado</Text>
                  : <Text style={{ color: '#ff4d4f', marginLeft: 6 }}>→ no encontrado</Text>}
              </Text>
            </div>
          )}
        </div>

        {/* Lista de productos — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 12px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prodFiltrados.map(p => (
              <div
                key={p.id}
                onClick={() => agregarAlCarrito(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid var(--ant-color-border, #d9d9d9)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,119,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Nombre + código */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>{p.nombre}</Text>
                  {p.codigo && <Text type="secondary" style={{ fontSize: 11 }}>{p.codigo}</Text>}
                </div>
                {/* Stock */}
                <Tag
                  color={p.stock_actual <= 0 ? 'error' : 'default'}
                  style={{ fontSize: 11, margin: 0 }}
                >
                  Stock: {p.stock_actual}
                </Tag>
                {/* Precio */}
                <Text style={{ color: '#1677ff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                  ${Number(p.precio_venta).toFixed(2)}
                </Text>
              </div>
            ))}
            {prodFiltrados.length === 0 && <Empty description="Sin resultados" style={{ padding: 24 }} />}
          </div>
        </div>
      </Card>

      {/* ── Panel derecho: carrito ─────────────────────────────── */}
      <Card
        title={<Space><ShoppingCartOutlined /><span>Carrito</span><Badge count={carrito.length} color="#1677ff" /></Space>}
        style={{ flex: 10, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, minHeight: 0, padding: '8px 12px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        {/* Tabla del carrito — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Table
            columns={colsCarrito}
            dataSource={carrito}
            rowKey="producto_id"
            size="small"
            pagination={false}
            locale={{ emptyText: 'Carrito vacío' }}
          />
        </div>

        {/* Totales y acciones — fijos */}
        <div style={{ flexShrink: 0, paddingBottom: 12 }}>
          <Divider style={{ margin: '8px 0' }} />
          <Row justify="space-between" style={{ marginBottom: 6 }}>
            <Text>Subtotal:</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </Row>
          <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
            <Text>Descuento:</Text>
            <Space.Compact size="small">
              <Select
                value={tipoDescuento}
                onChange={v => { setTipoDescuento(v); setDescuento(0) }}
                style={{ width: 56 }}
                options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]}
              />
              <InputNumber
                value={descuento}
                min={0}
                max={tipoDescuento === '%' ? 100 : subtotal}
                precision={tipoDescuento === '%' ? 1 : 2}
                onChange={v => setDescuento(v || 0)}
                size="small"
                style={{ width: 80 }}
              />
            </Space.Compact>
          </Row>
          <Row justify="space-between" style={{ marginBottom: 10 }}>
            <Text strong style={{ fontSize: 16 }}>TOTAL:</Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff' }}>${totalFinal.toFixed(2)}</Text>
          </Row>
          <Select
            value={metodoPago} onChange={setMetodoPago}
            style={{ width: '100%', marginBottom: 6 }}
            options={[
              { value: 'efectivo',        label: 'Efectivo' },
              { value: 'tarjeta_debito',  label: 'Tarjeta Débito' },
              { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
              { value: 'transferencia',   label: 'Transferencia' },
              { value: 'mercado_pago',    label: 'Mercado Pago' },
              { value: 'cuenta_dni',      label: 'Cuenta DNI' },
              { value: 'otro',            label: 'Otro' }
            ]}
          />
          <Input
            placeholder="Notas (opcional)" value={notas}
            onChange={e => setNotas(e.target.value)} style={{ marginBottom: 8 }}
          />
          <Button
            type="primary" icon={<CheckOutlined />} block size="large"
            loading={loading} onClick={confirmarVenta} disabled={carrito.length === 0}
          >
            Confirmar Venta
          </Button>
        </div>
      </Card>

      <TicketPreview
        open={ticketModal.open}
        venta={ticketModal.venta}
        items={ticketModal.items}
        onClose={() => {
          setTicketModal({ open: false, venta: null, items: [] })
          setTimeout(() => searchRef.current?.focus(), 100)
        }}
      />
    </div>
  )
}

// ── Historial de Ventas ──────────────────────────────────────────────────────
function HistorialVentas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [items, setItems] = useState([])
  const [ticketModal, setTicketModal] = useState({ open: false, venta: null, items: [] })
  const user = useAuthStore(s => s.user)

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

  async function imprimirTicket(venta) {
    const res = await window.api.ventas.getItems(venta.id)
    setTicketModal({ open: true, venta, items: res.data || [] })
  }

  async function anularVenta(id) {
    const res = await window.api.ventas.anular(id, user?.id)
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
      key: 'acc', width: 130,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => imprimirTicket(r)} />
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

      <TicketPreview
        open={ticketModal.open}
        venta={ticketModal.venta}
        items={ticketModal.items}
        onClose={() => setTicketModal({ open: false, venta: null, items: [] })}
      />
    </>
  )
}

export default function Ventas() {
  const [activeTab, setActiveTab] = useState('pos')
  const [refreshKey, setRefreshKey] = useState(0)

  const tabItems = [
    {
      key: 'pos',
      label: <Space><ShoppingCartOutlined />Punto de Venta</Space>,
      children: <POS onVentaCreada={() => setRefreshKey(k => k + 1)} active={activeTab === 'pos'} />
    },
    {
      key: 'historial',
      label: 'Historial de Ventas',
      children: <HistorialVentas key={refreshKey} />
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Ventas</Title>
      </div>
      <Card
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        <Tabs className="pos-tabs" items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </Card>
    </div>
  )
}
