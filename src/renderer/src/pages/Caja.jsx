import React, { useEffect, useState } from 'react'
import {
  Card, Button, Typography, Row, Col, Statistic, Table,
  Modal, Form, InputNumber, Input, Select, Tag, Space,
  Divider, message, Alert, Descriptions
} from 'antd'
import {
  WalletOutlined, LockOutlined, PlusCircleOutlined,
  MinusCircleOutlined, HistoryOutlined, PrinterOutlined, EyeOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const Caja = () => {
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalApertura, setModalApertura] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState({ open: false, tipo: 'ingreso' })
  const [modalCierre, setModalCierre] = useState(false)
  const [modalDetalle, setModalDetalle] = useState({ open: false, caja: null })
  const [movDetalle, setMovDetalle] = useState([])
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [formApertura] = Form.useForm()
  const [formMovimiento] = Form.useForm()
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [ca, hist] = await Promise.all([
      window.api.caja.getCajaAbierta(),
      window.api.caja.getAll()
    ])
    const caja = ca.data
    setCajaAbierta(caja)
    setHistorial(hist.data || [])
    if (caja) {
      const movRes = await window.api.caja.getMovimientos(caja.id)
      setMovimientos(movRes.data || [])
    }
    setLoading(false)
  }

  const abrirCaja = async () => {
    const values = await formApertura.validateFields()
    const res = await window.api.caja.abrir(values.saldo_inicial, user?.id)
    if (res.ok) {
      message.success(t('caja.openSuccess'))
      setModalApertura(false)
      loadData()
    } else message.error(res.error)
  }

  const cerrarCaja = async () => {
    const res = await window.api.caja.cerrar(cajaAbierta.id)
    if (res.ok) {
      const d = res.data
      message.success(t('caja.closeSuccess', { amount: d.saldoFinal?.toFixed(2) }))
      setModalCierre(false)
      loadData()
    } else message.error(res.error)
  }

  const addMovimiento = async () => {
    const values = await formMovimiento.validateFields()
    const res = await window.api.caja.addMovimiento({
      caja_id: cajaAbierta.id,
      tipo: modalMovimiento.tipo,
      ...values
    })
    if (res.ok) {
      message.success(t('caja.movSuccess'))
      setModalMovimiento({ open: false })
      loadData()
    } else message.error(res.error)
  }

  const verDetalleCaja = async (caja) => {
    setLoadingDetalle(true)
    setModalDetalle({ open: true, caja })
    const res = await window.api.caja.getMovimientos(caja.id)
    setMovDetalle(res.data || [])
    setLoadingDetalle(false)
  }

  const imprimirDetalle = (caja, movs) => {
    const ventas = movs.filter(m => m.tipo === 'venta')
    const ingresos = movs.filter(m => m.tipo === 'ingreso')
    const egresos = movs.filter(m => m.tipo === 'egreso')

    const porMetodo = ventas.reduce((acc, m) => {
      const k = m.metodo_pago || 'otro'
      if (!acc[k]) acc[k] = { metodo: k, cantidad: 0, total: 0 }
      acc[k].cantidad += 1
      acc[k].total += m.monto
      return acc
    }, {})
    const metodos = Object.values(porMetodo)

    const totalVentas  = ventas.reduce((a, m) => a + m.monto, 0)
    const totalIngresos = ingresos.reduce((a, m) => a + m.monto, 0)
    const totalEgresos  = egresos.reduce((a, m) => a + m.monto, 0)

    const fmt = v => `$${Number(v).toFixed(2)}`
    const fmtFecha = v => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-'

    const rowStyle = 'padding:4px 8px; border-bottom:1px solid #eee;'
    const thStyle  = 'padding:4px 8px; background:#f5f5f5; font-weight:600; text-align:left;'

    const movRows = movs.map(m => `
      <tr>
        <td style="${rowStyle}">${fmtFecha(m.fecha)}</td>
        <td style="${rowStyle}">${m.tipo.toUpperCase()}</td>
        <td style="${rowStyle}">${m.descripcion || '-'}</td>
        <td style="${rowStyle}">${m.metodo_pago || '-'}</td>
        <td style="${rowStyle}; text-align:right; color:${m.tipo === 'egreso' ? '#cc0000' : '#007700'}">
          ${m.tipo === 'egreso' ? '-' : '+'}${fmt(m.monto)}
        </td>
      </tr>`).join('')

    const metodoRows = metodos.map(m => `
      <tr>
        <td style="${rowStyle}">${m.metodo}</td>
        <td style="${rowStyle}; text-align:center;">${m.cantidad}</td>
        <td style="${rowStyle}; text-align:right; font-weight:600;">${fmt(m.total)}</td>
      </tr>`).join('')

    const html = `
      <html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; margin: 24px; color: #222; }
        h2 { margin-bottom: 4px; }
        h3 { margin: 20px 0 8px; border-bottom: 2px solid #222; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .resumen td { padding: 5px 8px; }
        .resumen td:first-child { font-weight: 600; width: 180px; }
        .resumen td:last-child { text-align: right; }
        .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #222; padding-top: 6px; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>Cierre de Caja #${caja.id}</h2>
      <p style="color:#555; margin:0 0 16px">
        Responsable: <b>${caja.usuario_nombre || '-'}</b> &nbsp;|&nbsp;
        Apertura: <b>${fmtFecha(caja.fecha_apertura)}</b> &nbsp;|&nbsp;
        Cierre: <b>${fmtFecha(caja.fecha_cierre)}</b>
      </p>

      <h3>Resumen</h3>
      <table class="resumen">
        <tr><td>Saldo inicial</td><td>${fmt(caja.saldo_inicial)}</td></tr>
        <tr><td>Total ventas</td><td>${fmt(totalVentas)}</td></tr>
        <tr><td>Ingresos manuales</td><td>${fmt(totalIngresos)}</td></tr>
        <tr><td>Egresos</td><td style="color:#cc0000">-${fmt(totalEgresos)}</td></tr>
        <tr class="total-row"><td>Saldo final</td><td>${fmt(caja.saldo_final ?? (caja.saldo_inicial + totalVentas + totalIngresos - totalEgresos))}</td></tr>
      </table>

      <h3>Ventas por Método de Pago</h3>
      <table>
        <thead><tr>
          <th style="${thStyle}">Método</th>
          <th style="${thStyle}; text-align:center;">Cant.</th>
          <th style="${thStyle}; text-align:right;">Total</th>
        </tr></thead>
        <tbody>${metodoRows || '<tr><td colspan="3" style="padding:8px">Sin ventas</td></tr>'}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:6px 8px; font-weight:700; border-top:2px solid #222;">TOTAL VENTAS</td>
          <td style="padding:6px 8px; text-align:right; font-weight:700; border-top:2px solid #222;">${fmt(totalVentas)}</td>
        </tr></tfoot>
      </table>

      <h3>Detalle de Movimientos</h3>
      <table>
        <thead><tr>
          <th style="${thStyle}">Fecha/Hora</th>
          <th style="${thStyle}">Tipo</th>
          <th style="${thStyle}">Descripción</th>
          <th style="${thStyle}">Método</th>
          <th style="${thStyle}; text-align:right;">Monto</th>
        </tr></thead>
        <tbody>${movRows || '<tr><td colspan="5" style="padding:8px">Sin movimientos</td></tr>'}</tbody>
      </table>
      </body></html>`

    window.api.print.ticket(html, { silent: false })
  }

  const totalVentas = movimientos.filter(m => m.tipo === 'venta').reduce((a, m) => a + m.monto, 0)
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0)
  const saldoActual = cajaAbierta ? (cajaAbierta.saldo_inicial + totalVentas + totalIngresos - totalEgresos) : 0

  const colsMovimientos = [
    { title: t('caja.colHour'), dataIndex: 'fecha', render: v => dayjs(v).format('HH:mm'), width: 60 },
    {
      title: t('caja.colType'), dataIndex: 'tipo',
      render: v => <Tag color={v === 'venta' ? 'blue' : v === 'ingreso' ? 'success' : 'error'}>{v === 'venta' ? t('caja.typeVenta') : v === 'ingreso' ? t('caja.typeIngreso') : t('caja.typeEgreso')}</Tag>,
      width: 90
    },
    { title: t('caja.colDescription'), dataIndex: 'descripcion', render: v => v || '-' },
    { title: t('caja.colMethod'), dataIndex: 'metodo_pago', render: v => v || '-' },
    { title: t('caja.colAmount'), dataIndex: 'monto', render: (v, r) => (
      <Text style={{ color: r.tipo === 'egreso' ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
        {r.tipo === 'egreso' ? '-' : '+'}${Number(v).toFixed(2)}
      </Text>
    ), align: 'right' }
  ]

  const colsHistorial = [
    { title: t('caja.histColId'), dataIndex: 'id', width: 50 },
    { title: t('caja.histColOpen'), dataIndex: 'fecha_apertura', render: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { title: t('caja.histColClose'), dataIndex: 'fecha_cierre', render: v => v ? dayjs(v).format('DD/MM/YY HH:mm') : '-' },
    { title: t('caja.histColInitial'), dataIndex: 'saldo_inicial', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: t('caja.histColFinal'), dataIndex: 'saldo_final', render: v => v != null ? `$${Number(v).toFixed(2)}` : '-', align: 'right' },
    { title: t('caja.histColSales'), dataIndex: 'total_ventas', render: v => `$${Number(v || 0).toFixed(2)}`, align: 'right' },
    { title: t('caja.histColUser'), dataIndex: 'usuario_nombre', render: v => v || '-' },
    {
      title: t('caja.histColStatus'), dataIndex: 'estado',
      render: v => <Tag color={v === 'abierta' ? 'success' : 'default'}>{v}</Tag>
    },
    {
      key: 'acc', width: 60, align: 'center',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalleCaja(r)} />
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('caja.title')}</Title>
        {!cajaAbierta ? (
          <Button type="primary" icon={<WalletOutlined />} onClick={() => { formApertura.resetFields(); setModalApertura(true) }}>
            {t('caja.openCaja')}
          </Button>
        ) : (
          <Space>
            <Button icon={<PlusCircleOutlined />} onClick={() => { formMovimiento.resetFields(); setModalMovimiento({ open: true, tipo: 'ingreso' }) }}>{t('caja.btnIngreso')}</Button>
            <Button icon={<MinusCircleOutlined />} danger onClick={() => { formMovimiento.resetFields(); setModalMovimiento({ open: true, tipo: 'egreso' }) }}>{t('caja.btnEgreso')}</Button>
            <Button icon={<LockOutlined />} onClick={() => setModalCierre(true)}>{t('caja.closeCaja')}</Button>
          </Space>
        )}
      </div>

      {!cajaAbierta ? (
        <>
          <Alert message={t('caja.noCajaAlert')} type="info" showIcon style={{ marginBottom: 16 }} />
          <Card title={<Space><HistoryOutlined />{t('caja.historyTitle')}</Space>}>
            <Table columns={colsHistorial} dataSource={historial} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize: 10 }} />
          </Card>
        </>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic title={t('caja.statInitial')} value={cajaAbierta.saldo_inicial} prefix="$" precision={2} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic title={t('caja.statSales')} value={totalVentas} prefix="$" precision={2} valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic title={t('caja.statInOut')}
                  value={totalIngresos - totalEgresos}
                  prefix="$" precision={2}
                  valueStyle={{ color: totalIngresos - totalEgresos >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #1677ff, #003a8c)', border: 'none' }}>
                <Statistic
                  title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>{t('caja.statCurrent')}</Text>}
                  value={saldoActual} prefix="$" precision={2}
                  valueStyle={{ color: '#fff', fontSize: 24 }}
                />
              </Card>
            </Col>
          </Row>

          <Card title={t('caja.currentMovements')}>
            <Table columns={colsMovimientos} dataSource={movimientos} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize: 15, showTotal: total => t('caja.pagMovements', { total }) }}
            />
          </Card>
        </>
      )}

      <Modal title={t('caja.modalOpenTitle')} open={modalApertura} onOk={abrirCaja}
        onCancel={() => setModalApertura(false)} okText={t('caja.openBtn')} cancelText={t('common.cancel')}>
        <Form form={formApertura} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="saldo_inicial" label={t('caja.fieldInitialBalance')} rules={[{ required: true }]} initialValue={0}>
            <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} size="large" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={modalMovimiento.tipo === 'ingreso' ? t('caja.modalIngresoTitle') : t('caja.modalEgresoTitle')}
        open={modalMovimiento.open}
        onOk={addMovimiento}
        onCancel={() => setModalMovimiento({ open: false })}
        okText={t('common.save')} cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={formMovimiento} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="monto" label={t('caja.fieldAmount')} rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="descripcion" label={t('caja.fieldDescription')} rules={[{ required: true }]}>
            <Input placeholder={modalMovimiento.tipo === 'ingreso' ? t('caja.ingresoPlaceholder') : t('caja.egresoPlaceholder')} />
          </Form.Item>
          <Form.Item name="metodo_pago" label={t('caja.fieldMethod')} initialValue="efectivo">
            <Select options={[
              { value: 'efectivo', label: t('caja.methods.efectivo') },
              { value: 'transferencia', label: t('caja.methods.transferencia') },
              { value: 'otro', label: t('caja.methods.otro') }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('caja.detailTitle', { id: modalDetalle.caja?.id })}
        open={modalDetalle.open}
        onCancel={() => setModalDetalle({ open: false, caja: null })}
        width={780}
        footer={
          <Space>
            <Button
              icon={<PrinterOutlined />}
              type="primary"
              onClick={() => imprimirDetalle(modalDetalle.caja, movDetalle)}
              disabled={loadingDetalle}
            >
              {t('caja.printPDF')}
            </Button>
            <Button onClick={() => setModalDetalle({ open: false, caja: null })}>{t('common.close')}</Button>
          </Space>
        }
        destroyOnClose
      >
        {modalDetalle.caja && (() => {
          const caja = modalDetalle.caja
          const ventas   = movDetalle.filter(m => m.tipo === 'venta')
          const ingresos = movDetalle.filter(m => m.tipo === 'ingreso')
          const egresos  = movDetalle.filter(m => m.tipo === 'egreso')
          const totalV = ventas.reduce((a, m) => a + m.monto, 0)
          const totalI = ingresos.reduce((a, m) => a + m.monto, 0)
          const totalE = egresos.reduce((a, m) => a + m.monto, 0)
          const saldoFinal = caja.saldo_final ?? (caja.saldo_inicial + totalV + totalI - totalE)

          const porMetodo = ventas.reduce((acc, m) => {
            const k = m.metodo_pago || 'otro'
            if (!acc[k]) acc[k] = { metodo: k, cantidad: 0, total: 0 }
            acc[k].cantidad += 1
            acc[k].total += m.monto
            return acc
          }, {})

          return (
            <>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label={t('caja.detailUser')}>{caja.usuario_nombre || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('caja.detailStatus')}>
                  <Tag color={caja.estado === 'abierta' ? 'success' : 'default'}>{caja.estado}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('caja.detailOpen')}>{dayjs(caja.fecha_apertura).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label={t('caja.detailClose')}>{caja.fecha_cierre ? dayjs(caja.fecha_cierre).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
              </Descriptions>

              <Row gutter={12} style={{ marginBottom: 16 }}>
                {[
                  { label: t('caja.statInitial'), value: caja.saldo_inicial, color: undefined },
                  { label: t('caja.statSales'), value: totalV, color: '#1677ff' },
                  { label: t('caja.btnIngreso'), value: totalI, color: '#52c41a' },
                  { label: t('caja.btnEgreso'), value: totalE, color: '#ff4d4f' },
                  { label: t('caja.statCurrent'), value: saldoFinal, color: '#1677ff', bold: true },
                ].map(({ label, value, color, bold }) => (
                  <Col span={4} key={label}>
                    <Card size="small" styles={{ body: { padding: '8px 10px' } }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: bold ? 700 : 600, color }}>
                        ${Number(value).toFixed(2)}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Divider orientation="left" style={{ margin: '8px 0 12px' }}>{t('caja.salesByMethod')}</Divider>
              <Table
                size="small"
                loading={loadingDetalle}
                dataSource={Object.values(porMetodo)}
                rowKey="metodo"
                pagination={false}
                style={{ marginBottom: 16 }}
                columns={[
                  { title: t('caja.colMethod2'), dataIndex: 'metodo', render: v => <Tag>{v}</Tag> },
                  { title: t('caja.colQty'), dataIndex: 'cantidad', align: 'center' },
                  { title: t('caja.colTotal'), dataIndex: 'total', render: v => <Text strong>${Number(v).toFixed(2)}</Text>, align: 'right' },
                ]}
                summary={() => (
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={2}><Text strong>{t('caja.totalLabel')}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell align="right"><Text strong style={{ color: '#1677ff' }}>${totalV.toFixed(2)}</Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
                locale={{ emptyText: t('caja.noSales') }}
              />

              <Divider orientation="left" style={{ margin: '8px 0 12px' }}>{t('caja.allMovements')}</Divider>
              <Table
                size="small"
                loading={loadingDetalle}
                dataSource={movDetalle}
                rowKey="id"
                pagination={{ pageSize: 10, showTotal: total => t('caja.pagMovements', { total }) }}
                columns={[
                  { title: t('caja.colHour'), dataIndex: 'fecha', width: 70, render: v => dayjs(v).format('HH:mm') },
                  {
                    title: t('caja.colType'), dataIndex: 'tipo', width: 90,
                    render: v => <Tag color={v === 'venta' ? 'blue' : v === 'ingreso' ? 'success' : 'error'}>{v === 'venta' ? t('caja.typeVenta') : v === 'ingreso' ? t('caja.typeIngreso') : t('caja.typeEgreso')}</Tag>
                  },
                  { title: t('caja.colDescription'), dataIndex: 'descripcion', render: v => v || '-' },
                  { title: t('caja.colMethod'), dataIndex: 'metodo_pago', width: 100, render: v => v || '-' },
                  {
                    title: t('caja.colAmount'), dataIndex: 'monto', align: 'right', width: 100,
                    render: (v, r) => (
                      <Text style={{ color: r.tipo === 'egreso' ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                        {r.tipo === 'egreso' ? '-' : '+'}${Number(v).toFixed(2)}
                      </Text>
                    )
                  }
                ]}
              />
            </>
          )
        })()}
      </Modal>

      <Modal title={t('caja.closeCajaTitle')} open={modalCierre} onOk={cerrarCaja}
        onCancel={() => setModalCierre(false)} okText={t('caja.closeConfirmBtn')} cancelText={t('common.cancel')}
        okButtonProps={{ danger: true }}>
        <Alert message={t('caja.closeWarning')} type="warning" showIcon style={{ marginBottom: 16 }} />
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('caja.closeLabelInitial')}>${Number(cajaAbierta?.saldo_inicial || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label={t('caja.closeLabelSales')}>${totalVentas.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label={t('caja.closeLabelExtra')}>${totalIngresos.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label={t('caja.closeLabelEgresos')}>${totalEgresos.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label={<Text strong>{t('caja.closeLabelFinal')}</Text>}><Text strong>${saldoActual.toFixed(2)}</Text></Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  )
}

export default Caja
