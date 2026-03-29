import React, { useEffect, useState } from 'react'
import {
  Card, Button, Typography, Row, Col, Statistic, Table,
  Modal, Form, InputNumber, Input, Select, Tag, Space,
  Divider, message, Alert, Descriptions
} from 'antd'
import {
  WalletOutlined, LockOutlined, PlusCircleOutlined,
  MinusCircleOutlined, HistoryOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Caja() {
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalApertura, setModalApertura] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState({ open: false, tipo: 'ingreso' })
  const [modalCierre, setModalCierre] = useState(false)
  const [formApertura] = Form.useForm()
  const [formMovimiento] = Form.useForm()
  const user = useAuthStore(s => s.user)

  useEffect(() => { loadData() }, [])

  async function loadData() {
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

  async function abrirCaja() {
    const values = await formApertura.validateFields()
    const res = await window.api.caja.abrir(values.saldo_inicial, user?.id)
    if (res.ok) {
      message.success('Caja abierta correctamente')
      setModalApertura(false)
      loadData()
    } else message.error(res.error)
  }

  async function cerrarCaja() {
    const res = await window.api.caja.cerrar(cajaAbierta.id)
    if (res.ok) {
      const d = res.data
      message.success(`Caja cerrada. Saldo final: $${d.saldoFinal?.toFixed(2)}`)
      setModalCierre(false)
      loadData()
    } else message.error(res.error)
  }

  async function addMovimiento() {
    const values = await formMovimiento.validateFields()
    const res = await window.api.caja.addMovimiento({
      caja_id: cajaAbierta.id,
      tipo: modalMovimiento.tipo,
      ...values
    })
    if (res.ok) {
      message.success('Movimiento registrado')
      setModalMovimiento({ open: false })
      loadData()
    } else message.error(res.error)
  }

  const totalVentas = movimientos.filter(m => m.tipo === 'venta').reduce((a, m) => a + m.monto, 0)
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0)
  const saldoActual = cajaAbierta ? (cajaAbierta.saldo_inicial + totalVentas + totalIngresos - totalEgresos) : 0

  const colsMovimientos = [
    { title: 'Hora', dataIndex: 'fecha', render: v => dayjs(v).format('HH:mm'), width: 60 },
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: v => <Tag color={v === 'venta' ? 'blue' : v === 'ingreso' ? 'success' : 'error'}>{v.toUpperCase()}</Tag>,
      width: 90
    },
    { title: 'Descripción', dataIndex: 'descripcion', render: v => v || '-' },
    { title: 'Método', dataIndex: 'metodo_pago', render: v => v || '-' },
    { title: 'Monto', dataIndex: 'monto', render: (v, r) => (
      <Text style={{ color: r.tipo === 'egreso' ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
        {r.tipo === 'egreso' ? '-' : '+'}${Number(v).toFixed(2)}
      </Text>
    ), align: 'right' }
  ]

  const colsHistorial = [
    { title: '#', dataIndex: 'id', width: 50 },
    { title: 'Apertura', dataIndex: 'fecha_apertura', render: v => dayjs(v).format('DD/MM/YY HH:mm') },
    { title: 'Cierre', dataIndex: 'fecha_cierre', render: v => v ? dayjs(v).format('DD/MM/YY HH:mm') : '-' },
    { title: 'Saldo Inicial', dataIndex: 'saldo_inicial', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: 'Saldo Final', dataIndex: 'saldo_final', render: v => v != null ? `$${Number(v).toFixed(2)}` : '-', align: 'right' },
    { title: 'Ventas', dataIndex: 'total_ventas', render: v => `$${Number(v || 0).toFixed(2)}`, align: 'right' },
    { title: 'Responsable', dataIndex: 'usuario_nombre', render: v => v || '-' },
    {
      title: 'Estado', dataIndex: 'estado',
      render: v => <Tag color={v === 'abierta' ? 'success' : 'default'}>{v}</Tag>
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Caja</Title>
        {!cajaAbierta ? (
          <Button type="primary" icon={<WalletOutlined />} onClick={() => { formApertura.resetFields(); setModalApertura(true) }}>
            Abrir Caja
          </Button>
        ) : (
          <Space>
            <Button icon={<PlusCircleOutlined />} onClick={() => { formMovimiento.resetFields(); setModalMovimiento({ open: true, tipo: 'ingreso' }) }}>Ingreso</Button>
            <Button icon={<MinusCircleOutlined />} danger onClick={() => { formMovimiento.resetFields(); setModalMovimiento({ open: true, tipo: 'egreso' }) }}>Egreso</Button>
            <Button icon={<LockOutlined />} onClick={() => setModalCierre(true)}>Cerrar Caja</Button>
          </Space>
        )}
      </div>

      {!cajaAbierta ? (
        <>
          <Alert message="No hay caja abierta. Abrí la caja para registrar ventas y movimientos." type="info" showIcon style={{ marginBottom: 16 }} />
          <Card title={<Space><HistoryOutlined />Historial de Cajas</Space>}>
            <Table columns={colsHistorial} dataSource={historial} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize: 10 }} />
          </Card>
        </>
      ) : (
        <>
          {/* Resumen caja actual */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic title="Saldo Inicial" value={cajaAbierta.saldo_inicial} prefix="$" precision={2} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic title="Ventas del Día" value={totalVentas} prefix="$" precision={2} valueStyle={{ color: '#1677ff' }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic title="Ingresos / Egresos"
                  value={totalIngresos - totalEgresos}
                  prefix="$" precision={2}
                  valueStyle={{ color: totalIngresos - totalEgresos >= 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #1677ff, #003a8c)', border: 'none' }}>
                <Statistic
                  title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Saldo Actual</Text>}
                  value={saldoActual} prefix="$" precision={2}
                  valueStyle={{ color: '#fff', fontSize: 24 }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Movimientos de la Caja Actual">
            <Table columns={colsMovimientos} dataSource={movimientos} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize: 15, showTotal: t => `${t} movimientos` }}
            />
          </Card>
        </>
      )}

      {/* Modal apertura */}
      <Modal title="Abrir Caja" open={modalApertura} onOk={abrirCaja}
        onCancel={() => setModalApertura(false)} okText="Abrir" cancelText="Cancelar">
        <Form form={formApertura} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="saldo_inicial" label="Saldo Inicial (efectivo en caja)" rules={[{ required: true }]} initialValue={0}>
            <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} size="large" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal ingreso/egreso */}
      <Modal
        title={modalMovimiento.tipo === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Egreso'}
        open={modalMovimiento.open}
        onOk={addMovimiento}
        onCancel={() => setModalMovimiento({ open: false })}
        okText="Guardar" cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={formMovimiento} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="monto" label="Monto" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input placeholder={modalMovimiento.tipo === 'ingreso' ? 'Ej: Retiro del banco' : 'Ej: Pago de servicios'} />
          </Form.Item>
          <Form.Item name="metodo_pago" label="Método" initialValue="efectivo">
            <Select options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'transferencia', label: 'Transferencia' },
              { value: 'otro', label: 'Otro' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal cierre de caja */}
      <Modal title="Cerrar Caja" open={modalCierre} onOk={cerrarCaja}
        onCancel={() => setModalCierre(false)} okText="Confirmar Cierre" cancelText="Cancelar"
        okButtonProps={{ danger: true }}>
        <Alert message="Esta acción cerrará la caja del día. No podrás registrar más movimientos en esta caja." type="warning" showIcon style={{ marginBottom: 16 }} />
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Saldo Inicial">${Number(cajaAbierta?.saldo_inicial || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Total Ventas">${totalVentas.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Ingresos Extra">${totalIngresos.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Egresos">${totalEgresos.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label={<Text strong>Saldo Final Estimado</Text>}><Text strong>${saldoActual.toFixed(2)}</Text></Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  )
}
