import React, { useEffect, useState, useRef } from 'react'
import {
  Card, Button, Input, InputNumber, Select, Table, Typography, Space,
  Tag, Divider, message, Empty, Badge, Row, Col
} from 'antd'
import { FileTextOutlined, DeleteOutlined, PrinterOutlined, BarcodeOutlined, ScanOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { generateQuoteHTML } from '../utils/receipt'
import dayjs from 'dayjs'

const { Text } = Typography

const GeneradorPresupuesto = ({ onCreado, active }) => {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [tipoDesc, setTipoDesc] = useState('$')
  const [validez, setValidez] = useState(30)
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const searchRef = useRef()
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()

  const loadProductos = async () => {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  useEffect(() => { loadProductos() }, [])
  useEffect(() => { if (active) setTimeout(() => searchRef.current?.focus(), 100) }, [active])

  const buscarPorCodigo = async (codigo) => {
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

  const agregarItem = (prod) => {
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

  const actualizarCantidad = (producto_id, cantidad) => {
    setCarrito(prev => prev.map(i => i.producto_id === producto_id
      ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario } : i
    ).filter(i => i.cantidad > 0))
  }

  const actualizarPrecio = (producto_id, precio) => {
    setCarrito(prev => prev.map(i => i.producto_id === producto_id
      ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio } : i))
  }

  const quitarItem = (producto_id) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
  }

  const subtotal = carrito.reduce((a, i) => a + i.subtotal, 0)
  const descuentoMonto = tipoDesc === '%' ? subtotal * (descuento / 100) : descuento
  const totalFinal = Math.max(0, subtotal - descuentoMonto)

  const generarPresupuesto = async () => {
    if (carrito.length === 0) return message.warning(t('cotizaciones.addProduct'))
    setLoading(true)
    try {
      const cotizacion = { subtotal, descuento: descuentoMonto, total: totalFinal, notas, validez_dias: validez }
      const items = carrito.map(i => ({
        producto_id: i.producto_id, nombre: i.nombre,
        cantidad: i.cantidad, precio_unitario: i.precio_unitario, subtotal: i.subtotal
      }))
      const res = await window.api.cotizaciones.create(cotizacion, items, user?.id)
      if (!res.ok) { message.error(res.error || t('common.error')); return }
      const id = res.data
      message.success(t('cotizaciones.generatedSuccess', { id }))
      const configRes = await window.api.config.getAll()
      const cotObj = {
        id, fecha: new Date().toISOString(), subtotal, descuento: descuentoMonto,
        total: totalFinal, notas, validez_dias: validez,
        usuario_nombre: user?.nombre, estado: 'pendiente'
      }
      const html = generateQuoteHTML(cotObj, items, configRes.data || {})
      window.api.print.ticket(html, { silent: false, pageSize: 'A4' })
      setCarrito([]); setDescuento(0); setTipoDesc('$'); setNotas(''); setLastScanned(null)
      onCreado?.()
    } catch (e) {
      message.error(t('cotizaciones.unexpectedError', { msg: e.message }))
    } finally {
      setLoading(false)
    }
  }

  const prodFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.includes(busqueda)
  ).slice(0, 30)

  const colsCarrito = [
    { title: t('ventas.colProduct'), dataIndex: 'nombre', ellipsis: true },
    {
      title: t('ventas.colPrice'), dataIndex: 'precio_unitario', width: 110,
      render: (v, r) => (
        <InputNumber value={v} min={0} precision={2} size="small" prefix="$"
          onChange={val => actualizarPrecio(r.producto_id, val || 0)} style={{ width: 100 }} />
      )
    },
    {
      title: t('ventas.colQty'), dataIndex: 'cantidad', width: 90,
      render: (v, r) => (
        <InputNumber value={v} min={0} size="small"
          onChange={val => actualizarCantidad(r.producto_id, val || 0)} style={{ width: 80 }} />
      )
    },
    { title: t('ventas.colSubtotal'), dataIndex: 'subtotal', render: v => `$${v.toFixed(2)}`, align: 'right', width: 90 },
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
              placeholder={t('ventas.searchPlaceholder')}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onSearch={buscarPorCodigo}
              enterButton={<><BarcodeOutlined /> {t('ventas.searchButton')}</>}
              style={{ flex: 1 }}
            />
            <Tag icon={<ScanOutlined />} color="blue" style={{ padding: '4px 8px', userSelect: 'none' }}>
              {t('ventas.usbReader')}
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
                  ? <Text style={{ color: '#52c41a', marginLeft: 6 }}>{t('ventas.scannedAdded', { nombre: lastScanned.nombre })}</Text>
                  : <Text style={{ color: '#ff4d4f', marginLeft: 6 }}>{t('ventas.scannedNotFound')}</Text>}
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
            {prodFiltrados.length === 0 && <Empty description={t('ventas.noProducts')} style={{ padding: 24 }} />}
          </div>
        </div>
      </Card>

      <Card
        title={<Space><FileTextOutlined /><span>{t('cotizaciones.budgetTitle')}</span><Badge count={carrito.length} color="#1677ff" /></Space>}
        style={{ flex: 10, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, minHeight: 0, padding: '8px 12px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Table columns={colsCarrito} dataSource={carrito} rowKey="producto_id"
            size="small" pagination={false} locale={{ emptyText: t('cotizaciones.noItems') }} />
        </div>

        <div style={{ flexShrink: 0, paddingBottom: 12 }}>
          <Divider style={{ margin: '8px 0' }} />
          <Row justify="space-between" style={{ marginBottom: 6 }}>
            <Text>{t('common.subtotal')}:</Text><Text>${subtotal.toFixed(2)}</Text>
          </Row>
          <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
            <Text>{t('common.discount')}:</Text>
            <Space.Compact size="small">
              <Select value={tipoDesc} onChange={v => { setTipoDesc(v); setDescuento(0) }}
                style={{ width: 56 }} options={[{ value: '$', label: '$' }, { value: '%', label: '%' }]} />
              <InputNumber value={descuento} min={0} max={tipoDesc === '%' ? 100 : subtotal}
                precision={tipoDesc === '%' ? 1 : 2} onChange={v => setDescuento(v || 0)}
                size="small" style={{ width: 80 }} />
            </Space.Compact>
          </Row>
          <Row justify="space-between" style={{ marginBottom: 10 }}>
            <Text strong style={{ fontSize: 16 }}>{t('common.total')}:</Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff' }}>${totalFinal.toFixed(2)}</Text>
          </Row>
          <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
            <Text>{t('cotizaciones.validityDays')}</Text>
            <InputNumber value={validez} min={1} max={365} onChange={v => setValidez(v || 30)}
              size="small" style={{ width: 80 }} />
          </Row>
          <Input.TextArea placeholder={t('cotizaciones.notesPlaceholder')} value={notas}
            onChange={e => setNotas(e.target.value)} rows={2} style={{ marginBottom: 8 }} />
          <Button type="primary" icon={<PrinterOutlined />} block size="large"
            loading={loading} onClick={generarPresupuesto} disabled={carrito.length === 0}>
            {t('cotizaciones.generatePDF')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default GeneradorPresupuesto
