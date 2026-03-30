import React, { useEffect, useState, useRef } from 'react'
import {
  Card, Button, Input, InputNumber, Select, Table, Typography, Space,
  Tag, Divider, Modal, message, Popconfirm, Empty, Tabs, Badge, Row, Col
} from 'antd'
import {
  FileTextOutlined, DeleteOutlined, CheckOutlined, EyeOutlined,
  PrinterOutlined, BarcodeOutlined, ScanOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { generateQuoteHTML } from '../utils/receipt'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const ESTADO_COLOR = {
  pendiente: 'gold',
  aceptada:  'green',
  rechazada: 'red',
  vencida:   'default'
}

function GeneradorPresupuesto({ onCreado, active }) {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito]     = useState([])
  const [busqueda, setBusqueda]   = useState('')
  const [descuento, setDescuento] = useState(0)
  const [tipoDesc, setTipoDesc]   = useState('$')
  const [validez, setValidez]     = useState(30)
  const [notas, setNotas]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const searchRef = useRef()
  const user = useAuthStore(s => s.user)

  useEffect(() => { loadProductos() }, [])
  useEffect(() => { if (active) setTimeout(() => searchRef.current?.focus(), 100) }, [active])

  async function loadProductos() {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  async function buscarPorCodigo(codigo) {
    const code = codigo?.trim()
    if (!code) return
    const res = await window.api.productos.getByCodigo(code)
    const match = (res.ok && res.data) ? res.data
      : productos.find(p => p.nombre?.toLowerCase().includes(code.toLowerCase()) || p.codigo === code)
    if (match) {
      agregarItem(match)
      setLastScanned({ code, nombre: match.nombre, ok: true })
      setBusqueda('')
    } else {
      setLastScanned({ code, ok: false })
      message.warning({ content: `"${code}" no encontrado`, key: 'scan', duration: 2 })
    }
  }

  useBarcodeScanner(code => buscarPorCodigo(code), { enabled: active, minLength: 3, maxDelay: 50 })

  function agregarItem(prod) {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === prod.id)
      if (existe) return prev.map(i => i.producto_id === prod.id
        ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario } : i)
      return [...prev, {
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_unitario: prod.precio_venta,
        cantidad: 1,
        subtotal: prod.precio_venta
      }]
    })
  }

  function actualizarCantidad(producto_id, cantidad) {
    setCarrito(prev => prev.map(i => i.producto_id === producto_id
      ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario } : i
    ).filter(i => i.cantidad > 0))
  }

  function actualizarPrecio(producto_id, precio) {
    setCarrito(prev => prev.map(i => i.producto_id === producto_id
      ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio } : i))
  }

  function quitarItem(producto_id) {
    setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
  }

  const subtotal       = carrito.reduce((a, i) => a + i.subtotal, 0)
  const descuentoMonto = tipoDesc === '%' ? subtotal * (descuento / 100) : descuento
  const totalFinal     = Math.max(0, subtotal - descuentoMonto)

  async function generarPresupuesto() {
    if (carrito.length === 0) return message.warning('Agregá al menos un producto')
    setLoading(true)
    try {
      const cotizacion = { subtotal, descuento: descuentoMonto, total: totalFinal, notas, validez_dias: validez }
      const items = carrito.map(i => ({
        producto_id: i.producto_id, nombre: i.nombre,
        cantidad: i.cantidad, precio_unitario: i.precio_unitario, subtotal: i.subtotal
      }))
      const res = await window.api.cotizaciones.create(cotizacion, items, user?.id)
      if (!res.ok) {
        message.error(res.error || 'Error al generar presupuesto')
        return
      }
      const id = res.data
      message.success(`Presupuesto #${id} generado`)
      const configRes = await window.api.config.getAll()
      const config = configRes.data || {}
      const cotObj = {
        id, fecha: new Date().toISOString(), subtotal, descuento: descuentoMonto,
        total: totalFinal, notas, validez_dias: validez,
        usuario_nombre: user?.nombre, estado: 'pendiente'
      }
      const html = generateQuoteHTML(cotObj, items, config)
      window.api.print.ticket(html, { silent: false, pageSize: 'A4' })
      setCarrito([]); setDescuento(0); setTipoDesc('$'); setNotas(''); setLastScanned(null)
      onCreado?.()
    } catch (e) {
      message.error('Error inesperado: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const prodFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.includes(busqueda)
  ).slice(0, 30)

  const colsCarrito = [
    { title: 'Producto', dataIndex: 'nombre', ellipsis: true },
    {
      title: 'Precio', dataIndex: 'precio_unitario', width: 110,
      render: (v, r) => (
        <InputNumber value={v} min={0} precision={2} size="small" prefix="$"
          onChange={val => actualizarPrecio(r.producto_id, val || 0)} style={{ width: 100 }} />
      )
    },
    {
      title: 'Cant.', dataIndex: 'cantidad', width: 90,
      render: (v, r) => (
        <InputNumber value={v} min={0} size="small"
          onChange={val => actualizarCantidad(r.producto_id, val || 0)} style={{ width: 80 }} />
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

      <Card
        style={{ flex: 14, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
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
            <Tag icon={<ScanOutlined />} color="blue" style={{ padding: '4px 8px', userSelect: 'none' }}>
              Lector USB
            </Tag>
          </div>
          {lastScanned && (
            <div style={{
              marginTop: 6, padding: '4px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
              background: lastScanned.ok ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${lastScanned.ok ? '#b7eb8f' : '#ffccc7'}`
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

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 12px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prodFiltrados.map(p => (
              <div key={p.id} onClick={() => agregarItem(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                  borderRadius: 6, cursor: 'pointer', border: '1px solid var(--ant-color-border, #d9d9d9)',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,119,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>{p.nombre}</Text>
                  {p.codigo && <Text type="secondary" style={{ fontSize: 11 }}>{p.codigo}</Text>}
                </div>
                <Tag color={p.stock_actual <= 0 ? 'error' : 'default'} style={{ fontSize: 11, margin: 0 }}>
                  Stock: {p.stock_actual}
                </Tag>
                <Text style={{ color: '#1677ff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                  ${Number(p.precio_venta).toFixed(2)}
                </Text>
              </div>
            ))}
            {prodFiltrados.length === 0 && <Empty description="Sin resultados" style={{ padding: 24 }} />}
          </div>
        </div>
      </Card>

      <Card
        title={<Space><FileTextOutlined /><span>Presupuesto</span><Badge count={carrito.length} color="#1677ff" /></Space>}
        style={{ flex: 10, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, minHeight: 0, padding: '8px 12px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Table columns={colsCarrito} dataSource={carrito} rowKey="producto_id"
            size="small" pagination={false} locale={{ emptyText: 'Sin ítems' }} />
        </div>

        <div style={{ flexShrink: 0, paddingBottom: 12 }}>
          <Divider style={{ margin: '8px 0' }} />
          <Row justify="space-between" style={{ marginBottom: 6 }}>
            <Text>Subtotal:</Text><Text>${subtotal.toFixed(2)}</Text>
          </Row>
          <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
            <Text>Descuento:</Text>
            <Space.Compact size="small">
              <Select value={tipoDesc} onChange={v => { setTipoDesc(v); setDescuento(0) }}
                style={{ width: 56 }} options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]} />
              <InputNumber value={descuento} min={0} max={tipoDesc === '%' ? 100 : subtotal}
                precision={tipoDesc === '%' ? 1 : 2} onChange={v => setDescuento(v || 0)}
                size="small" style={{ width: 80 }} />
            </Space.Compact>
          </Row>
          <Row justify="space-between" style={{ marginBottom: 10 }}>
            <Text strong style={{ fontSize: 16 }}>TOTAL:</Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff' }}>${totalFinal.toFixed(2)}</Text>
          </Row>
          <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
            <Text>Validez (días):</Text>
            <InputNumber value={validez} min={1} max={365} onChange={v => setValidez(v || 30)}
              size="small" style={{ width: 80 }} />
          </Row>
          <Input.TextArea placeholder="Notas / condiciones adicionales" value={notas}
            onChange={e => setNotas(e.target.value)} rows={2} style={{ marginBottom: 8 }} />
          <Button type="primary" icon={<PrinterOutlined />} block size="large"
            loading={loading} onClick={generarPresupuesto} disabled={carrito.length === 0}>
            Generar Presupuesto (PDF)
          </Button>
        </div>
      </Card>
    </div>
  )
}

function HistorialCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading]           = useState(false)
  const [detalle, setDetalle]           = useState(null)
  const [items, setItems]               = useState([])
  const [loadingPdf, setLoadingPdf]     = useState(false)

  useEffect(() => { loadCotizaciones() }, [])

  async function loadCotizaciones() {
    setLoading(true)
    const res = await window.api.cotizaciones.getAll()
    setCotizaciones(res.data || [])
    setLoading(false)
  }

  async function verDetalle(cot) {
    const res = await window.api.cotizaciones.getItems(cot.id)
    setItems(res.data || [])
    setDetalle(cot)
  }

  async function imprimirPDF(cot) {
    setLoadingPdf(true)
    const [itemsRes, configRes] = await Promise.all([
      window.api.cotizaciones.getItems(cot.id),
      window.api.config.getAll()
    ])
    const html = generateQuoteHTML(cot, itemsRes.data || [], configRes.data || {})
    await window.api.print.ticket(html, { silent: false, pageSize: 'A4' })
    setLoadingPdf(false)
  }

  async function cambiarEstado(id, estado) {
    const res = await window.api.cotizaciones.updateEstado(id, estado)
    if (res.ok) { message.success('Estado actualizado'); loadCotizaciones() }
    else message.error(res.error)
  }

  async function eliminar(id) {
    const res = await window.api.cotizaciones.delete(id)
    if (res.ok) { message.success('Cotización eliminada'); loadCotizaciones() }
    else message.error(res.error)
  }

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Fecha', dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YY HH:mm'), width: 130 },
    { title: 'Total', dataIndex: 'total', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: 'Validez', dataIndex: 'validez_dias', render: v => `${v} días`, width: 80 },
    {
      title: 'Estado', dataIndex: 'estado', width: 110,
      render: (v, r) => (
        <Select value={v} size="small" style={{ width: 110 }}
          onChange={val => cambiarEstado(r.id, val)}
          options={[
            { value: 'pendiente', label: <Tag color="gold">Pendiente</Tag> },
            { value: 'aceptada',  label: <Tag color="green">Aceptada</Tag> },
            { value: 'rechazada', label: <Tag color="red">Rechazada</Tag> },
            { value: 'vencida',   label: <Tag color="default">Vencida</Tag> }
          ]}
        />
      )
    },
    { title: 'Vendedor', dataIndex: 'usuario_nombre', render: v => v || '-' },
    {
      key: 'acc', width: 110,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)} />
          <Button size="small" icon={<PrinterOutlined />} loading={loadingPdf} onClick={() => imprimirPDF(r)} />
          <Popconfirm title="¿Eliminar esta cotización?" onConfirm={() => eliminar(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Table columns={columns} dataSource={cotizaciones} rowKey="id" loading={loading}
        size="small" pagination={{ pageSize: 15, showTotal: t => `${t} cotizaciones` }}
        style={{ padding: '8px 16px' }}
      />

      <Modal
        title={`Presupuesto #${detalle?.id}`}
        open={!!detalle}
        onCancel={() => setDetalle(null)}
        width={560}
        footer={
          <Space>
            <Button icon={<PrinterOutlined />} type="primary" onClick={() => imprimirPDF(detalle)}>
              Imprimir / PDF
            </Button>
            <Button onClick={() => setDetalle(null)}>Cerrar</Button>
          </Space>
        }
      >
        {detalle && (
          <>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}><Text type="secondary">Fecha:</Text><br /><Text>{dayjs(detalle.fecha).format('DD/MM/YYYY HH:mm')}</Text></Col>
              <Col span={12}><Text type="secondary">Estado:</Text><br /><Tag color={ESTADO_COLOR[detalle.estado]}>{detalle.estado}</Tag></Col>
              <Col span={12} style={{ marginTop: 8 }}><Text type="secondary">Validez:</Text><br /><Text>{detalle.validez_dias} días</Text></Col>
              <Col span={12} style={{ marginTop: 8 }}><Text type="secondary">Vence:</Text><br /><Text>{dayjs(detalle.fecha).add(detalle.validez_dias, 'day').format('DD/MM/YYYY')}</Text></Col>
            </Row>
            {detalle.notas && <p style={{ marginBottom: 12 }}><Text type="secondary">Notas:</Text> {detalle.notas}</p>}
            <Table
              columns={[
                { title: 'Producto', dataIndex: 'nombre' },
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

export default function Cotizaciones() {
  const [activeTab, setActiveTab] = useState('nuevo')
  const [refreshKey, setRefreshKey] = useState(0)

  const tabItems = [
    {
      key: 'nuevo',
      label: <Space><FileTextOutlined />Nuevo Presupuesto</Space>,
      children: <GeneradorPresupuesto onCreado={() => setRefreshKey(k => k + 1)} active={activeTab === 'nuevo'} />
    },
    {
      key: 'historial',
      label: 'Historial de Cotizaciones',
      children: <HistorialCotizaciones key={refreshKey} />
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Cotizaciones</Title>
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
