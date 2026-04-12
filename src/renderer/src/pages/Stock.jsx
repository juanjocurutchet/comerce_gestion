import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Select, Modal, Form,
  InputNumber, Input, Tag, message, Card, Tabs, Alert, DatePicker
} from 'antd'
import { PlusOutlined, MinusOutlined, WarningOutlined, CalendarOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const Stock = () => {
  const [productos, setProductos] = useState([])
  const [stockBajo, setStockBajo] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, tipo: 'ingreso' })
  const [form] = Form.useForm()
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
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

  const openModal = (tipo) => {
    setModal({ open: true, tipo })
    form.resetFields()
    form.setFieldValue('tipo', tipo)
  }

  const handleAjuste = async () => {
    const values = await form.validateFields()
    if (values.fecha_vencimiento) {
      values.fecha_vencimiento = values.fecha_vencimiento.format('YYYY-MM-DD')
    }
    const res = await window.api.stock.ajuste(values, user?.id)
    if (res.ok) {
      message.success(t('stock.adjustSuccess'))
      setModal({ open: false })
      loadAll()
    } else {
      message.error(res.error || t('stock.adjustError'))
    }
  }

  const colsProductos = [
    { title: t('stock.colName'), dataIndex: 'nombre' },
    { title: t('stock.colCode'), dataIndex: 'codigo', render: v => v || '-' },
    { title: t('stock.colCategory'), dataIndex: 'categoria_nombre', render: v => v ? <Tag>{v}</Tag> : '-' },
    {
      title: t('stock.colCurrentStock'), dataIndex: 'stock_actual',
      render: (v, r) => (
        <Tag color={v <= 0 ? 'error' : v <= r.stock_minimo ? 'warning' : 'success'}>
          {v} {r.unidad}
        </Tag>
      ),
      align: 'center',
      sorter: (a, b) => a.stock_actual - b.stock_actual
    },
    { title: t('stock.colMinStock'), dataIndex: 'stock_minimo', align: 'center' },
    {
      title: t('stock.colStatus'), key: 'estado',
      render: (_, r) => r.stock_actual <= 0
        ? <Tag color="error">{t('stock.statusEmpty')}</Tag>
        : r.stock_actual <= r.stock_minimo
          ? <Tag color="warning">{t('stock.statusLow')}</Tag>
          : <Tag color="success">{t('stock.statusOk')}</Tag>,
      align: 'center'
    }
  ]

  const colsMovimientos = [
    { title: t('stock.colDate'), dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YYYY HH:mm'), width: 140 },
    { title: t('stock.colProduct'), dataIndex: 'producto_nombre' },
    {
      title: t('stock.colType'), dataIndex: 'tipo',
      render: v => <Tag color={v === 'ingreso' ? 'success' : 'error'}>{v === 'ingreso' ? t('stock.typeIngreso') : t('stock.typeEgreso')}</Tag>,
      width: 90, align: 'center'
    },
    { title: t('stock.colQuantity'), dataIndex: 'cantidad', align: 'right' },
    { title: t('stock.colPrevStock'), dataIndex: 'stock_anterior', align: 'right' },
    { title: t('stock.colNewStock'), dataIndex: 'stock_nuevo', align: 'right' },
    { title: t('stock.colReason'), dataIndex: 'motivo', render: v => v || '-' },
    {
      title: t('stock.colExpiry'), dataIndex: 'fecha_vencimiento',
      render: (v, r) => {
        if (!v || r.tipo !== 'ingreso') return t('stock.noExpiry')
        const dias = dayjs(v).diff(dayjs(), 'day')
        const color = dias < 0 ? 'error' : dias <= 7 ? 'error' : dias <= 30 ? 'warning' : 'default'
        return <Tag color={color} icon={<CalendarOutlined />}>{dayjs(v).format('DD/MM/YY')}</Tag>
      },
      width: 140
    }
  ]

  const tabItems = [
    {
      key: 'inventario',
      label: t('stock.tabInventory'),
      children: (
        <>
          {stockBajo.length > 0 && (
            <Alert
              message={t('stock.lowStockAlert', { count: stockBajo.length })}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}
          <Table columns={colsProductos} dataSource={productos} rowKey="id" loading={loading} size="small"
            pagination={{ pageSize: 15, showTotal: total => t('stock.pagProducts', { total }) }}
            rowClassName={(r) => r.stock_actual <= 0 ? 'ant-table-row-danger' : r.stock_actual <= r.stock_minimo ? 'ant-table-row-warning' : ''}
          />
        </>
      )
    },
    {
      key: 'movimientos',
      label: t('stock.tabMovements'),
      children: (
        <Table columns={colsMovimientos} dataSource={movimientos} rowKey="id" loading={loading} size="small"
          pagination={{ pageSize: 15, showTotal: total => t('stock.pagMovements', { total }) }}
        />
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('stock.title')}</Title>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => openModal('ingreso')}>{t('stock.btnIngreso')}</Button>
          <Button icon={<MinusOutlined />} danger onClick={() => openModal('egreso')}>{t('stock.btnEgreso')}</Button>
        </Space>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title={modal.tipo === 'ingreso' ? t('stock.modalIngresoTitle') : t('stock.modalEgresoTitle')}
        open={modal.open}
        onOk={handleAjuste}
        onCancel={() => setModal({ open: false })}
        okText={t('stock.registerBtn')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="tipo" hidden><Input /></Form.Item>
          <Form.Item name="producto_id" label={t('stock.fieldProduct')} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t('stock.searchProduct')}
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              options={productos.map(p => ({ value: p.id, label: `${p.nombre}${p.codigo ? ' - ' + p.codigo : ''}` }))}
            />
          </Form.Item>
          <Form.Item name="cantidad" label={t('stock.fieldQuantity')} rules={[{ required: true }, { type: 'number', min: 0.01 }]}>
            <InputNumber min={0.01} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item name="motivo" label={t('stock.fieldReason')}>
            <Input placeholder={modal.tipo === 'ingreso' ? t('stock.reasonPlaceholderIngreso') : t('stock.reasonPlaceholderEgreso')} />
          </Form.Item>
          {modal.tipo === 'ingreso' && (
            <Form.Item name="fecha_vencimiento" label={t('stock.fieldExpiry')}
              extra={t('stock.expiryExtra')}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={t('common.never')} allowClear />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default Stock
