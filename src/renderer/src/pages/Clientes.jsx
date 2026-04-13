import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Typography, Tag, Modal,
  Form, Input, InputNumber, Popconfirm, message, Tabs, Tooltip, Select
} from 'antd'
import {
  UserAddOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, UnorderedListOutlined, TagsOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const Clientes = () => {
  const [clientes, setClientes] = useState([])
  const [saldos, setSaldos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [listaPrecios, setListaPrecios] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('clientes')
  const [modal, setModal] = useState({ open: false, record: null })
  const [pagoModal, setPagoModal] = useState({ open: false, cliente: null })
  const [movModal, setMovModal] = useState({ open: false, cliente: null })
  const [form] = Form.useForm()
  const [pagoForm] = Form.useForm()
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()

  const loadClientes = async () => {
    const res = await window.api.clientes.getAll()
    setClientes(res.data || [])
  }

  const loadSaldos = async () => {
    const res = await window.api.cuentaCorriente.getAllSaldos()
    setSaldos(res.data || [])
  }

  useEffect(() => {
    loadClientes()
    loadSaldos()
    window.api.listasPrecio.getAll().then(r => setListaPrecios(r.data || []))
  }, [])

  const openModal = (record = null) => {
    setModal({ open: true, record })
    form.setFieldsValue(record || { nombre: '', telefono: '', dni: '', email: '', notas: '' })
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    const res = modal.record
      ? await window.api.clientes.update({ ...values, id: modal.record.id })
      : await window.api.clientes.create(values)
    setLoading(false)
    if (!res.ok) { message.error(res.error); return }
    message.success(t('clientes.saveSuccess'))
    setModal({ open: false, record: null })
    loadClientes()
    loadSaldos()
  }

  const handleDelete = async (id) => {
    const res = await window.api.clientes.delete(id)
    if (res.ok) { message.success(t('clientes.deleteSuccess')); loadClientes(); loadSaldos() }
    else message.error(res.error)
  }

  const openMovimientos = async (cliente) => {
    const res = await window.api.cuentaCorriente.getMovimientos(cliente.id)
    setMovimientos(res.data || [])
    setMovModal({ open: true, cliente })
  }

  const openPago = (cliente) => {
    setPagoModal({ open: true, cliente })
    pagoForm.resetFields()
  }

  const handlePago = async () => {
    const values = await pagoForm.validateFields()
    setLoading(true)
    const res = await window.api.cuentaCorriente.registrarPago(
      pagoModal.cliente.id, values.monto, values.descripcion, user?.id
    )
    setLoading(false)
    if (!res.ok) { message.error(res.error); return }
    message.success(t('clientes.paymentSuccess'))
    setPagoModal({ open: false, cliente: null })
    loadSaldos()
  }

  const colsClientes = [
    { title: t('clientes.colName'), dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: t('clientes.colPhone'), dataIndex: 'telefono', render: v => v || '—' },
    { title: t('clientes.colDNI'), dataIndex: 'dni', render: v => v || '—' },
    { title: t('clientes.colEmail'), dataIndex: 'email', render: v => v || '—' },
    {
      key: 'acciones', width: 80, align: 'center',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('common.edit')}>
            <Button type="text" icon={<EditOutlined />} onClick={() => openModal(r)} />
          </Tooltip>
          <Popconfirm title={t('clientes.deleteConfirm')} onConfirm={() => handleDelete(r.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const colsCuentas = [
    { title: t('clientes.colName'), dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: t('clientes.colPhone'), dataIndex: 'telefono', render: v => v || '—' },
    {
      title: t('clientes.colBalance'), dataIndex: 'saldo', align: 'right',
      sorter: (a, b) => b.saldo - a.saldo,
      render: (saldo) => {
        if (saldo === 0) return <Tag color="default">{t('clientes.balanceZero')}</Tag>
        return (
          <Text strong style={{ color: saldo > 0 ? '#ff4d4f' : '#52c41a', fontSize: 15 }}>
            {saldo > 0 ? `$${saldo.toFixed(2)} (${t('clientes.balanceDebt')})` : `$${Math.abs(saldo).toFixed(2)} (${t('clientes.balanceCredit')})`}
          </Text>
        )
      }
    },
    {
      key: 'acciones', width: 120, align: 'center',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('clientes.movements')}>
            <Button type="text" icon={<UnorderedListOutlined />} onClick={() => openMovimientos(r)} />
          </Tooltip>
          <Tooltip title={t('clientes.registerPayment')}>
            <Button type="text" icon={<DollarOutlined />} onClick={() => openPago(r)} disabled={r.saldo <= 0} />
          </Tooltip>
        </Space>
      )
    }
  ]

  const colsMovimientos = [
    { title: t('clientes.colMovDate'), dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YY HH:mm'), width: 130 },
    {
      title: t('clientes.colMovType'), dataIndex: 'tipo', width: 90,
      render: v => <Tag color={v === 'cargo' ? 'red' : 'green'}>{v === 'cargo' ? t('clientes.typeCargo') : t('clientes.typePago')}</Tag>
    },
    {
      title: t('clientes.colMovAmount'), dataIndex: 'monto', align: 'right', width: 100,
      render: (v, r) => <Text style={{ color: r.tipo === 'cargo' ? '#ff4d4f' : '#52c41a' }}>
        {r.tipo === 'cargo' ? '+' : '-'}${v.toFixed(2)}
      </Text>
    },
    { title: t('clientes.colMovDesc'), dataIndex: 'descripcion', ellipsis: true }
  ]

  const totalDeuda = saldos.filter(c => c.saldo > 0).reduce((a, c) => a + c.saldo, 0)

  const tabItems = [
    {
      key: 'clientes',
      label: t('clientes.tabClientes'),
      children: (
        <Table
          columns={colsClientes}
          dataSource={clientes}
          rowKey="id"
          size="small"
          locale={{ emptyText: t('clientes.noClients') }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
        />
      )
    },
    {
      key: 'cuentas',
      label: t('clientes.tabCuentas'),
      children: (
        <>
          {totalDeuda > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(255,77,79,0.08)', borderRadius: 8, display: 'inline-block' }}>
              <Text>{t('clientes.totalDebt')}: </Text>
              <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>${totalDeuda.toFixed(2)}</Text>
            </div>
          )}
          <Table
            columns={colsCuentas}
            dataSource={saldos}
            rowKey="id"
            size="small"
            locale={{ emptyText: t('clientes.noClients') }}
            pagination={{ pageSize: 15, showSizeChanger: false }}
          />
        </>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('clientes.title')}</Title>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => openModal()}>
          {t('clientes.newClient')}
        </Button>
      </div>

      <Card
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'auto', padding: 16 } }}
      >
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </Card>

      <Modal
        title={modal.record ? t('clientes.editClient') : t('clientes.newClient')}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label={t('clientes.colName')} rules={[{ required: true }]}>
            <Input placeholder={t('clientes.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="telefono" label={t('clientes.colPhone')}>
            <Input placeholder={t('clientes.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="dni" label={t('clientes.colDNI')}>
            <Input placeholder={t('clientes.dniPlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('clientes.colEmail')}>
            <Input placeholder={t('clientes.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="notas" label={t('clientes.notesLabel')}>
            <Input.TextArea rows={2} placeholder={t('clientes.notesPlaceholder')} />
          </Form.Item>
          {listaPrecios.length > 0 && (
            <Form.Item
              name="lista_precio_id"
              label={<Space size={4}><TagsOutlined />{t('clientes.priceList')}</Space>}
              extra={t('clientes.priceListExtra')}
            >
              <Select
                allowClear
                placeholder={t('clientes.priceListPlaceholder')}
                options={listaPrecios.map(l => ({ value: l.id, label: l.nombre }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={`${t('clientes.registerPayment')} — ${pagoModal.cliente?.nombre}`}
        open={pagoModal.open}
        onOk={handlePago}
        onCancel={() => setPagoModal({ open: false, cliente: null })}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={pagoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="monto" label={t('clientes.paymentAmount')} rules={[{ required: true }]}>
            <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} size="large" />
          </Form.Item>
          <Form.Item name="descripcion" label={t('clientes.paymentDesc')}>
            <Input placeholder={t('clientes.paymentDescPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t('clientes.movements')} — ${movModal.cliente?.nombre}`}
        open={movModal.open}
        onCancel={() => setMovModal({ open: false, cliente: null })}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Table
          columns={colsMovimientos}
          dataSource={movimientos}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: t('clientes.noMovements') }}
          style={{ marginTop: 12 }}
        />
      </Modal>
    </div>
  )
}

export default Clientes
