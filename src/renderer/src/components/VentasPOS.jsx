import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Row, Card, Table, Button, Input, InputNumber, Select,
  Typography, Space, Tag, Divider, message, Empty, Badge, Tooltip, Modal
} from 'antd'
import {
  DeleteOutlined, ShoppingCartOutlined, CheckOutlined,
  BarcodeOutlined, ScanOutlined, WarningOutlined, SearchOutlined, CalendarOutlined, PlusOutlined,
  TagsOutlined
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

const POS = ({ onVentaCreada, active, priceCheckTrigger }) => {
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
  const [selectedCartRow, setSelectedCartRow] = useState(null)
  const [priceCheck, setPriceCheck] = useState({ open: false, query: '', results: [], notFound: false })
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [listaPrecios, setListaPrecios] = useState([])
  const [listaSeleccionada, setListaSeleccionada] = useState(null)
  const [listaPreciosMap, setListaPreciosMap] = useState({})
  const user = useAuthStore(s => s.user)
  const searchRef = useRef()
  const descuentoRef = useRef()
  const priceCheckRef = useRef()
  const { t } = useTranslation()

  const loadProductos = async () => {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  const loadClientes = async () => {
    const res = await window.api.clientes.getAll()
    setClientes(res.data || [])
  }

  const loadListaPrecios = async () => {
    const res = await window.api.listasPrecio.getAll()
    setListaPrecios(res.data || [])
  }

  useEffect(() => { loadProductos(); loadClientes(); loadListaPrecios() }, [])

  useEffect(() => {
    if (!listaSeleccionada) { setListaPreciosMap({}); return }
    window.api.listasPrecio.getAllItems(listaSeleccionada).then(res => {
      const map = {}
      for (const item of (res.data || [])) map[item.producto_id] = item.precio
      setListaPreciosMap(map)
    })
  }, [listaSeleccionada])

  useEffect(() => {
    if (active) setTimeout(() => searchRef.current?.focus(), 100)
  }, [active])

  useEffect(() => {
    if (priceCheckTrigger > 0) abrirPriceCheck()
  }, [priceCheckTrigger])

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
      const precio = listaPreciosMap[prod.id] ?? prod.precio_venta
      return [...prev, {
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_unitario: precio,
        cantidad: 1,
        subtotal: precio,
        stock: prod.stock_actual,
        fecha_vencimiento: prod.fecha_vencimiento || null
      }]
    })
  }

  const actualizarCantidad = useCallback((producto_id, cantidad) => {
    setCarrito(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario }
        : i
    ).filter(i => i.cantidad > 0))
  }, [])

  const actualizarPrecio = (producto_id, precio) => {
    setCarrito(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, precio_unitario: precio, subtotal: i.cantidad * precio }
        : i
    ))
  }

  const quitarItem = useCallback((producto_id) => {
    setCarrito(prev => prev.filter(i => i.producto_id !== producto_id))
  }, [])

  const buscarPrecio = useCallback((query) => {
    const q = query?.trim()
    if (!q) { setPriceCheck(p => ({ ...p, results: [], notFound: false })); return }
    const lower = q.toLowerCase()
    const results = productos.filter(p =>
      p.nombre?.toLowerCase().includes(lower) || p.codigo?.includes(q)
    ).slice(0, 6)
    setPriceCheck(p => ({ ...p, query: q, results, notFound: results.length === 0 }))
  }, [productos])

  const abrirPriceCheck = useCallback(() => {
    setPriceCheck({ open: true, query: '', results: [], notFound: false })
    setTimeout(() => priceCheckRef.current?.focus(), 80)
  }, [])

  const cerrarPriceCheck = useCallback(() => {
    setPriceCheck({ open: false, query: '', results: [], notFound: false })
    setTimeout(() => searchRef.current?.focus(), 80)
  }, [])

  const limpiarCarrito = useCallback(() => {
    setCarrito([])
    setDescuento(0)
    setTipoDescuento('$')
    setMontoRecibido('')
    setLastScanned(null)
    setSelectedCartRow(null)
    setClienteSeleccionado(null)
    setTimeout(() => searchRef.current?.focus(), 50)
    message.info({ content: t('ventas.cartCleared'), key: 'f2', duration: 1.5 })
  }, [t])

  const navigateCart = useCallback((dir, carritoActual, selected) => {
    if (carritoActual.length === 0) return
    const idx = carritoActual.findIndex(i => i.producto_id === selected)
    const next = idx === -1
      ? (dir > 0 ? 0 : carritoActual.length - 1)
      : Math.max(0, Math.min(carritoActual.length - 1, idx + dir))
    setSelectedCartRow(carritoActual[next].producto_id)
  }, [])

  const subtotal = carrito.reduce((a, i) => a + i.subtotal, 0)
  const descuentoMonto = tipoDescuento === '%' ? subtotal * (descuento / 100) : descuento
  const totalFinal = Math.max(0, subtotal - descuentoMonto)

  const confirmarVenta = useCallback(async (carritoActual, subtotalVal, descuentoMontoVal, totalFinalVal, metodoPagoVal, clienteId) => {
    if (carritoActual.length === 0) return message.warning(t('ventas.emptyCartWarning'))
    if (metodoPagoVal === 'cuenta_corriente' && !clienteId) {
      return message.warning(t('ventas.selectClienteWarning'))
    }
    setLoading(true)
    const venta = { subtotal: subtotalVal, descuento: descuentoMontoVal, total: totalFinalVal, metodo_pago: metodoPagoVal, notas: '' }
    const items = carritoActual.map(i => ({
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal: i.subtotal
    }))
    const res = await window.api.ventas.create(venta, items, user?.id, clienteId || null)
    setLoading(false)
    if (res.ok) {
      const ventaId = res.data
      message.success(t('ventas.saleSuccess', { id: ventaId }))
      const ventaObj = {
        id: ventaId,
        fecha: new Date().toISOString(),
        subtotal: subtotalVal,
        descuento: descuentoMontoVal,
        total: totalFinalVal,
        metodo_pago: metodoPagoVal,
        notas: '',
        usuario_nombre: user?.nombre
      }
      setTicketModal({ open: true, venta: ventaObj, items: carritoActual.map(i => ({ ...i, producto_nombre: i.nombre })) })
      setCarrito([])
      setDescuento(0)
      setTipoDescuento('$')
      setMontoRecibido('')
      setLastScanned(null)
      setSelectedCartRow(null)
      setClienteSeleccionado(null)
      onVentaCreada?.()
    } else {
      message.error(res.error || t('ventas.saleError'))
    }
  }, [user, onVentaCreada, t])

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)

      if (e.key === 'F2') {
        e.preventDefault()
        limpiarCarrito()
        return
      }
      if (e.key === 'F3') {
        e.preventDefault()
        if (priceCheck.open) cerrarPriceCheck()
        else abrirPriceCheck()
        return
      }
      if (e.key === 'F8') {
        e.preventDefault()
        descuentoRef.current?.focus()
        return
      }
      if (e.key === 'F9') {
        e.preventDefault()
        if (carrito.length > 0 && !loading) confirmarVenta(carrito, subtotal, descuentoMonto, totalFinal, metodoPago, clienteSeleccionado?.id)
        return
      }
      if (e.key === 'Escape' && ticketModal.open) {
        setTicketModal({ open: false, venta: null, items: [] })
        setTimeout(() => searchRef.current?.focus(), 100)
        return
      }
      if (inInput) return
      if (e.key === 'ArrowUp') { e.preventDefault(); navigateCart(-1, carrito, selectedCartRow); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); navigateCart(1, carrito, selectedCartRow); return }
      if ((e.key === '+' || e.key === 'Add') && selectedCartRow) {
        e.preventDefault()
        const item = carrito.find(i => i.producto_id === selectedCartRow)
        if (item) actualizarCantidad(selectedCartRow, item.cantidad + 1)
        return
      }
      if ((e.key === '-' || e.key === 'Subtract') && selectedCartRow) {
        e.preventDefault()
        const item = carrito.find(i => i.producto_id === selectedCartRow)
        if (item) actualizarCantidad(selectedCartRow, Math.max(0, item.cantidad - 1))
        return
      }
      if (e.key === 'Delete' && selectedCartRow) {
        e.preventDefault()
        quitarItem(selectedCartRow)
        setSelectedCartRow(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, carrito, selectedCartRow, loading, ticketModal.open, priceCheck.open, subtotal, descuentoMonto, totalFinal, metodoPago,
      limpiarCarrito, confirmarVenta, navigateCart, actualizarCantidad, quitarItem, abrirPriceCheck, cerrarPriceCheck])

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
          {listaPrecios.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Select
                allowClear
                placeholder={t('ventas.selectPriceList')}
                value={listaSeleccionada}
                onChange={v => setListaSeleccionada(v || null)}
                style={{ width: '100%' }}
                size="small"
                options={listaPrecios.map(l => ({ value: l.id, label: l.nombre }))}
                prefix={<TagsOutlined />}
              />
            </div>
          )}
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
                  ${Number(listaPreciosMap[p.id] ?? p.precio_venta).toFixed(2)}
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
            onRow={(r) => ({
              onClick: () => setSelectedCartRow(r.producto_id),
              style: {
                cursor: 'pointer',
                background: r.producto_id === selectedCartRow ? 'rgba(22,119,255,0.1)' : undefined,
                outline: r.producto_id === selectedCartRow ? '1px solid rgba(22,119,255,0.35)' : undefined,
              }
            })}
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
                ref={descuentoRef}
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
            onChange={v => { setMetodoPago(v); setMontoRecibido(''); if (v !== 'cuenta_corriente') setClienteSeleccionado(null) }}
            style={{ width: '100%', marginBottom: 6 }}
            options={[
              { value: 'efectivo',          label: t('ventas.methods.efectivo') },
              { value: 'tarjeta_debito',    label: t('ventas.methods.tarjeta_debito') },
              { value: 'tarjeta_credito',   label: t('ventas.methods.tarjeta_credito') },
              { value: 'transferencia',     label: t('ventas.methods.transferencia') },
              { value: 'mercado_pago',      label: t('ventas.methods.mercado_pago') },
              { value: 'cuenta_dni',        label: t('ventas.methods.cuenta_dni') },
              { value: 'cuenta_corriente',  label: t('ventas.methods.cuenta_corriente') },
              { value: 'otro',              label: t('ventas.methods.otro') }
            ]}
          />
          {metodoPago === 'cuenta_corriente' && (
            <Select
              showSearch
              placeholder={t('ventas.selectCliente')}
              value={clienteSeleccionado?.id}
              onChange={(_, opt) => setClienteSeleccionado({ id: opt.value, nombre: opt.label })}
              style={{ width: '100%', marginBottom: 6 }}
              filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
              options={clientes.map(c => ({ value: c.id, label: c.nombre }))}
              status={!clienteSeleccionado ? 'warning' : ''}
            />
          )}
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
          <div style={{ display: 'flex', gap: 6 }}>
            <Tooltip title="F2" placement="top">
              <Button
                icon={<PlusOutlined />}
                size="large"
                onClick={limpiarCarrito}
                style={{ flexShrink: 0 }}
              >
                {t('ventas.shortcutClear')}
              </Button>
            </Tooltip>
            <Tooltip title="F9" placement="top">
              <Button
                type="primary" icon={<CheckOutlined />}
                size="large"
                style={{ flex: 1 }}
                loading={loading}
                onClick={() => confirmarVenta(carrito, subtotal, descuentoMonto, totalFinal, metodoPago, clienteSeleccionado?.id)}
                disabled={carrito.length === 0}
              >
                {t('ventas.confirmSale')}
              </Button>
            </Tooltip>
          </div>
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

      <Modal
        title={<Space><SearchOutlined />{t('ventas.priceCheckTitle')}</Space>}
        open={priceCheck.open}
        onCancel={cerrarPriceCheck}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Input.Search
          ref={priceCheckRef}
          placeholder={t('ventas.priceCheckPlaceholder')}
          value={priceCheck.query}
          onChange={e => { setPriceCheck(p => ({ ...p, query: e.target.value })); buscarPrecio(e.target.value) }}
          onSearch={buscarPrecio}
          enterButton
          allowClear
          size="large"
          style={{ marginBottom: 12 }}
        />

        {priceCheck.notFound && (
          <Empty description={t('ventas.priceCheckNotFound')} style={{ padding: '16px 0' }} />
        )}

        {priceCheck.results.map(p => {
          const ev = estadoVencimiento(p.fecha_vencimiento)
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 8, marginBottom: 8,
              border: '1px solid var(--ant-color-border, #d9d9d9)',
              background: 'var(--ant-color-bg-container, #fff)'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
                <Space size={6} style={{ marginTop: 3 }}>
                  {p.codigo && <Tag style={{ fontSize: 11, margin: 0 }}>{p.codigo}</Tag>}
                  {p.categoria_nombre && <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{p.categoria_nombre}</Tag>}
                  {ev && <Tag color={ev.color} icon={<CalendarOutlined />} style={{ fontSize: 11, margin: 0 }}>{ev.label}</Tag>}
                </Space>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1677ff', lineHeight: 1 }}>
                  ${Number(listaPreciosMap[p.id] ?? p.precio_venta).toFixed(2)}
                </div>
                <Tag
                  color={p.stock_actual <= 0 ? 'error' : p.stock_actual <= p.stock_minimo ? 'warning' : 'success'}
                  style={{ fontSize: 11, marginTop: 4 }}
                >
                  Stock: {p.stock_actual} {p.unidad}
                </Tag>
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: 8, textAlign: 'center', color: '#aaa', fontSize: 12 }}>
          {t('ventas.priceCheckHint')}
        </div>
      </Modal>
    </div>
  )
}

export default POS
