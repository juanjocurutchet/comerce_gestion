import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Select, Modal, Form,
  InputNumber, Input, Tag, message, Card, Row, Col, Tabs, Alert
} from 'antd'
import { PlusOutlined, MinusOutlined, WarningOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Stock() {
  const [productos, setProductos] = useState([])
  const [stockBajo, setStockBajo] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, tipo: 'ingreso' })
  const [form] = Form.useForm()
  const user = useAuthStore(s => s.user)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [p, sb, m] = await Promise.all([
      window.api.productos.getAll(),
      window.api.productos.getStockBajo(),
      window.api.stock.getMovimientos(null)
    ])
    setProductos(p.data || [])
    setStockBajo(sb.data || [])
    setMovimientos(m.data || [])
    setLoading(false)
  }

  function openModal(tipo) {
    setModal({ open: true, tipo })
    form.resetFields()
    form.setFieldValue('tipo', tipo)
  }

  async function handleAjuste() {
    const values = await form.validateFields()
    const res = await window.api.stock.ajuste(values, user?.id)
    if (res.ok) {
      message.success('Ajuste de stock registrado')
      setModal({ open: false })
      loadAll()
    } else {
      message.error(res.error || 'Error al ajustar stock')
    }
  }

  const colsProductos = [
    { title: 'Nombre', dataIndex: 'nombre' },
    { title: 'Código', dataIndex: 'codigo', render: v => v || '-' },
    { title: 'Categoría', dataIndex: 'categoria_nombre', render: v => v ? <Tag>{v}</Tag> : '-' },
    {
      title: 'Stock Actual', dataIndex: 'stock_actual',
      render: (v, r) => (
        <Tag color={v <= 0 ? 'error' : v <= r.stock_minimo ? 'warning' : 'success'}>
          {v} {r.unidad}
        </Tag>
      ),
      align: 'center',
      sorter: (a, b) => a.stock_actual - b.stock_actual
    },
    { title: 'Stock Mínimo', dataIndex: 'stock_minimo', align: 'center' },
    {
      title: 'Estado', key: 'estado',
      render: (_, r) => r.stock_actual <= 0
        ? <Tag color="error">Sin stock</Tag>
        : r.stock_actual <= r.stock_minimo
          ? <Tag color="warning">Stock bajo</Tag>
          : <Tag color="success">OK</Tag>,
      align: 'center'
    }
  ]

  const colsMovimientos = [
    { title: 'Fecha', dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YYYY HH:mm'), width: 140 },
    { title: 'Producto', dataIndex: 'producto_nombre' },
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: v => <Tag color={v === 'ingreso' ? 'success' : 'error'}>{v.toUpperCase()}</Tag>,
      width: 90, align: 'center'
    },
    { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' },
    { title: 'Stock Ant.', dataIndex: 'stock_anterior', align: 'right' },
    { title: 'Stock Nuevo', dataIndex: 'stock_nuevo', align: 'right' },
    { title: 'Motivo', dataIndex: 'motivo', render: v => v || '-' }
  ]

  const tabItems = [
    {
      key: 'inventario',
      label: 'Inventario',
      children: (
        <>
          {stockBajo.length > 0 && (
            <Alert
              message={`${stockBajo.length} producto(s) con stock bajo o agotado`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}
          <Table columns={colsProductos} dataSource={productos} rowKey="id" loading={loading} size="small"
            pagination={{ pageSize: 15, showTotal: t => `${t} productos` }}
            rowClassName={(r) => r.stock_actual <= 0 ? 'ant-table-row-danger' : r.stock_actual <= r.stock_minimo ? 'ant-table-row-warning' : ''}
          />
        </>
      )
    },
    {
      key: 'movimientos',
      label: 'Historial de Movimientos',
      children: (
        <Table columns={colsMovimientos} dataSource={movimientos} rowKey="id" loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: t => `${t} movimientos` }}
        />
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Control de Stock</Title>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => openModal('ingreso')}>Ingreso</Button>
          <Button icon={<MinusOutlined />} danger onClick={() => openModal('egreso')}>Egreso</Button>
        </Space>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title={modal.tipo === 'ingreso' ? 'Ingreso de Stock' : 'Egreso de Stock'}
        open={modal.open}
        onOk={handleAjuste}
        onCancel={() => setModal({ open: false })}
        okText="Registrar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="tipo" hidden><Input /></Form.Item>
          <Form.Item name="producto_id" label="Producto" rules={[{ required: true, message: 'Seleccioná un producto' }]}>
            <Select
              showSearch
              placeholder="Buscar producto..."
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              options={productos.map(p => ({ value: p.id, label: `${p.nombre}${p.codigo ? ' - ' + p.codigo : ''}` }))}
            />
          </Form.Item>
          <Form.Item name="cantidad" label="Cantidad" rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber min={0.01} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item name="motivo" label="Motivo / Observación">
            <Input placeholder={modal.tipo === 'ingreso' ? 'Ej: Compra a proveedor' : 'Ej: Merma, rotura...'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
