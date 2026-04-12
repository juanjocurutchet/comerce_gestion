import React, { useEffect, useState, useRef } from 'react'
import {
  Row, Card, Table, Button, Input, InputNumber, Select,
  Typography, Space, Tag, Divider, message, Empty, Badge, Tooltip
} from 'antd'
import {
  DeleteOutlined, ShoppingCartOutlined, CheckOutlined,
  BarcodeOutlined, ScanOutlined, WarningOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import TicketPreview from './TicketPreview'
import dayjs from 'dayjs'

const { Text } = Typography

const estadoVencimiento = (fecha) => {
  if (!fecha) return null
  const dias = dayjs(fecha).diff(dayjs(), 'day')
  if (dias < 0) return { color: 'error', label: 'VENCIDO' }
  if (dias <= 7) return { color: 'error', label: `Vence en ${dias}d` }
  if (dias <= 30) return { color: 'warning', label: `Vence en ${dias}d` }
  return null
}

const POS = ({ onVentaCreada, active }) => {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [tipoDescuento, setTipoDescuento] = useState('$')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [ticketModal, setTicketModal] = useState({ open: false, venta: null, items: [] })
  const user = useAuthStore(s => s.user)
  const searchRef = useRef()
  const { t } = useTranslation()

  const loadProductos = async () => {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  useEffect(() => { loadProductos() }, [])

  useEffect(() => {
    if (active) setTimeout(() => searchRef.current?.focus(), 100)
  }, [active])

  const buscarPorCodigo = async (codigo) => {
    const code = codigo?.trim()
    if (!code) return
    const res = await window.api.productos.getByCodigo(code)
    if (res.ok && res.data) {
      agregarAlCarrito(res.data)
      setLastScanned({ code, nombre: res.data.nombre, ok: true })
      setBusqueda('')
    } else {
      const match = productos.find(p =>
        p.nombre?.toLowerCase().includes(code.toLowerCase()) || p.codigo === code
      )
      if (match) {
        agregarAlCarrito(match)
        setLastScanned({ code, nombre: match.nombre, ok: true })
        setBusqueda('')
      } else {
        setLastScanned({ code, ok: false })
        message.warning({ content: t('ventas.codeNotFound', { code }), key: 'scan-warn', duration: 2 })
      }
    }
  }

  useBarcodeScanner(
    (code) => buscarPorCodigo(code),
    { enabled: active, minLength: 3, maxDelay: 50 }
  )

  const agregarAlCarrito = (prod) => {
    const ev = estadoVencimiento(prod.fecha_vencimiento)
    if (ev?.color === 'error' && prod.fecha_vencimiento) {
      const dias = dayjs(prod.fecha_vencimiento).diff(dayjs(), 'day')
      if (dias < 0) {
        message.warning({
          content: t('ventas.expiredProduct', { nombre: prod.nombre, date: dayjs(prod.fecha_vencimiento).format('DD/MM/YY') }),
          duration: 3
        })
      }
    }
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
        stock: prod.stock_actual,
        fecha_vencimiento: prod.fecha_vencimiento || null
      }]
    })
  }

  const actualizarCantidad = (producto_id, cantidad) => {
    setCarrito(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario }
        : i
    ).filter(i => i.cantidad > 0))
  }

  const actualizarPrecio = (producto_id, precio) => {
    setCarrito(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio }
        : i
    ))
  }

  const quitarItem = (producto_id) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
  }

  const subtotal = carrito.reduce((a, i) => a + i.subtotal, 0)
  const descuentoMonto = tipoDescuento === '%' ? subtotal * (descuento / 100) : descuento
  const totalFinal = Math.max(0, subtotal - descuentoMonto)

  const confirmarVenta = async () => {
    if (carrito.length === 0) return message.warning(t('ventas.emptyCartWarning'))
    setLoading(true)
    const venta = { subtotal, descuento: descuentoMonto, total: totalFinal, metodo_pago: metodoPago, notas: '' }
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
      message.success(t('ventas.saleSuccess', { id: ventaId }))
      const ventaObj = {
        id: ventaId,
        fecha: new Date().toISOString(),
        subtotal,
        descuento: descuentoMonto,
        total: totalFinal,
        metodo_pago: metodoPago,
        notas: '',
        usuario_nombre: user?.nombre
      }
      setTicketModal({ open: true, venta: ventaObj, items: carrito.map(i => ({ ...i, producto_nombre: i.nombre })) })
      setCarrito([])
      setDescuento(0)
      setTipoDescuento('$')
      setMontoRecibido('')
      setLastScanned(null)
      onVentaCreada?.()
    } else {
      message.error(res.error || t('ventas.saleError'))
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
        <InputNumber
          value={v} min={0} precision={2} size="small" prefix="$"
          onChange={val => actualizarPrecio(r.producto_id, val || 0)}
          style={{ width: 100 }}
        />
      )
    },
    {
      title: t('ventas.colQty'), dataIndex: 'cantidad', width: 90,
      render: (v, r) => (
        <InputNumber
          value={v} min={0} size="small"
          onChange={val => actualizarCantidad(r.producto_id, val || 0)}
          style={{ width: 80 }}
        />
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
            <Tooltip title={t('ventas.usbReaderTooltip')}>
              <Tag icon={<ScanOutlined />} color="blue" style={{ cursor: 'help', userSelect: 'none', padding: '4px 8px' }}>
                {t('ventas.usbReader')}
              </Tag>
            </Tooltip>
          </div>

          {lastScanned && (
            <div style={{
              marginTop: 6, padding: '4px 10px', borderRadius: 6,
              background: lastScanned.ok ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${lastScanned.ok ? '#b7eb8f' : '#ffccc7'}`,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>{p.nombre}</Text>
                  {p.codigo && <Text type="secondary" style={{ fontSize: 11 }}>{p.codigo}</Text>}
                </div>
                {(() => {
                  const ev = estadoVencimiento(p.fecha_vencimiento)
                  return ev ? <Tag color={ev.color} icon={<WarningOutlined />} style={{ fontSize: 11, margin: 0 }}>{ev.label}</Tag> : null
                })()}
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
        title={<Space><ShoppingCartOutlined /><span>{t('ventas.cartTitle')}</span><Badge count={carrito.length} color="#1677ff" /></Space>}
        style={{ flex: 10, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, minHeight: 0, padding: '8px 12px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <Table
            columns={colsCarrito}
            dataSource={carrito}
            rowKey="producto_id"
            size="small"
            pagination={false}
            locale={{ emptyText: t('ventas.cartEmpty') }}
          />
        </div>

        <div style={{ flexShrink: 0, paddingBottom: 12 }}>
          <Divider style={{ margin: '8px 0' }} />
          <Row justify="space-between" style={{ marginBottom: 6 }}>
            <Text>{t('common.subtotal')}:</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </Row>
          <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
            <Text>{t('common.discount')}:</Text>
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
            <Text strong style={{ fontSize: 16 }}>{t('common.total')}:</Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff' }}>${totalFinal.toFixed(2)}</Text>
          </Row>
          <Select
            value={metodoPago}
            onChange={v => { setMetodoPago(v); setMontoRecibido('') }}
            style={{ width: '100%', marginBottom: 6 }}
            options={[
              { value: 'efectivo',        label: t('ventas.methods.efectivo') },
              { value: 'tarjeta_debito',  label: t('ventas.methods.tarjeta_debito') },
              { value: 'tarjeta_credito', label: t('ventas.methods.tarjeta_credito') },
              { value: 'transferencia',   label: t('ventas.methods.transferencia') },
              { value: 'mercado_pago',    label: t('ventas.methods.mercado_pago') },
              { value: 'cuenta_dni',      label: t('ventas.methods.cuenta_dni') },
              { value: 'otro',            label: t('ventas.methods.otro') }
            ]}
          />
          {metodoPago === 'efectivo' && (
            <>
              <div style={{ marginBottom: 6 }}>
                <Text style={{ display: 'block', marginBottom: 4 }}>{t('ventas.receivedAmount')}</Text>
                <InputNumber
                  value={montoRecibido}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                  formatter={v => v !== '' && v != null ? `$ ${v}` : ''}
                  parser={v => v.replace(/\$\s?/g, '')}
                  onChange={v => setMontoRecibido(v ?? '')}
                  size="large"
                  className="monto-recibido"
                  style={{ width: '100%' }}
                  controls={false}
                />
              </div>
              {montoRecibido !== '' && montoRecibido >= 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8, padding: '8px 12px', borderRadius: 6,
                  background: montoRecibido >= totalFinal ? 'rgba(82,196,26,0.12)' : 'rgba(255,77,79,0.12)',
                  border: `1px solid ${montoRecibido >= totalFinal ? 'rgba(82,196,26,0.35)' : 'rgba(255,77,79,0.35)'}`,
                }}>
                  <Text strong style={{ fontSize: 15 }}>{t('ventas.change')}</Text>
                  <Text strong style={{ fontSize: 20, color: montoRecibido >= totalFinal ? '#52c41a' : '#ff4d4f' }}>
                    ${Math.max(0, montoRecibido - totalFinal).toFixed(2)}
                  </Text>
                </div>
              )}
            </>
          )}
          <Button
            type="primary" icon={<CheckOutlined />} block size="large"
            loading={loading} onClick={confirmarVenta} disabled={carrito.length === 0}
          >
            {t('ventas.confirmSale')}
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

export default POS
