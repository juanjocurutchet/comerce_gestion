import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Tag, Card, Modal, Form,
  Input, DatePicker, Switch, InputNumber, Popconfirm, message,
  Row, Col, Statistic, Alert, Checkbox, Divider
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined, PlusCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const ALL_FEATURES = [
  { key: 'ventas',        label: 'Ventas' },
  { key: 'cotizaciones',  label: 'Cotizaciones' },
  { key: 'productos',     label: 'Productos' },
  { key: 'stock',         label: 'Stock' },
  { key: 'proveedores',   label: 'Proveedores' },
  { key: 'caja',          label: 'Caja' },
  { key: 'reportes',      label: 'Reportes' },
  { key: 'usuarios',      label: 'Usuarios' },
  { key: 'backup',        label: 'Backup' },
  { key: 'configuracion', label: 'Configuración' }
]

const DEFAULT_FEATURES = Object.fromEntries(ALL_FEATURES.map(f => [f.key, true]))

function statusTag(row) {
  if (!row.activo) return <Tag color="red">Desactivada</Tag>
  const days = Math.ceil((new Date(row.vence_en) - Date.now()) / 86400000)
  if (days < 0) return <Tag color="volcano">Vencida</Tag>
  if (days <= 7) return <Tag color="orange">Vence en {days}d</Tag>
  return <Tag color="green">Activa</Tag>
}

function lastCheckTag(row) {
  if (!row.last_check) return <Tag color="default">Nunca</Tag>
  const days = Math.floor((Date.now() - new Date(row.last_check).getTime()) / 86400000)
  if (days === 0) return <Tag color="green">Hoy</Tag>
  if (days <= 7) return <Tag color="blue">{days}d</Tag>
  if (days <= 15) return <Tag color="orange">{days}d</Tag>
  return <Tag color="red">{days}d</Tag>
}

export default function Licencias() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [newKey, setNewKey] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await window.api.license.getAll()
    if (res.ok) setData(res.data)
    else message.error(res.error)
    setLoading(false)
  }

  function openModal(record = null) {
    setNewKey(null)
    setModal({ open: true, record })
    if (record) {
      const features = record.features ? Object.keys(record.features).filter(k => record.features[k]) : Object.keys(DEFAULT_FEATURES)
      form.setFieldsValue({ ...record, vence_en: dayjs(record.vence_en), features })
    } else {
      form.resetFields()
      form.setFieldsValue({ activo: true, grace_days: 15, features: Object.keys(DEFAULT_FEATURES) })
    }
  }

  async function handleSave() {
    const values = await form.validateFields()
    const featuresObj = Object.fromEntries(ALL_FEATURES.map(f => [f.key, (values.features || []).includes(f.key)]))
    const payload = { ...values, vence_en: values.vence_en.format('YYYY-MM-DD'), features: featuresObj }
    delete payload.features_checkboxes
    const res = modal.record
      ? await window.api.license.update(modal.record.id, payload)
      : await window.api.license.create(payload)

    if (res.ok) {
      if (!modal.record) {
        setNewKey(res.data?.clave)
      } else {
        message.success('Licencia actualizada')
        setModal({ open: false, record: null })
      }
      load()
    } else {
      message.error(res.error)
    }
  }

  async function extenderUnMes(record) {
    const base = new Date(record.vence_en) > new Date() ? new Date(record.vence_en) : new Date()
    base.setMonth(base.getMonth() + 1)
    const nuevaFecha = base.toISOString().split('T')[0]
    const res = await window.api.license.update(record.id, { vence_en: nuevaFecha, activo: true })
    if (res.ok) { message.success(`Extendida hasta ${dayjs(nuevaFecha).format('DD/MM/YYYY')}`); load() }
    else message.error(res.error)
  }

  async function toggleActivo(record) {
    const res = await window.api.license.update(record.id, { activo: !record.activo })
    if (res.ok) { message.success(record.activo ? 'Desactivada' : 'Activada'); load() }
    else message.error(res.error)
  }

  async function handleDelete(id) {
    const res = await window.api.license.delete(id)
    if (res.ok) { message.success('Eliminada'); load() }
    else message.error(res.error)
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key)
    message.success('Clave copiada')
  }

  const activas    = data.filter(r => r.activo && new Date(r.vence_en) > new Date()).length
  const vencidas   = data.filter(r => new Date(r.vence_en) < new Date()).length
  const desactivas = data.filter(r => !r.activo).length

  const columns = [
    { title: 'Cliente', dataIndex: 'cliente_nombre', sorter: (a, b) => a.cliente_nombre.localeCompare(b.cliente_nombre) },
    {
      title: 'Clave', dataIndex: 'clave',
      render: v => (
        <Space>
          <Text code style={{ fontSize: 12 }}>{v}</Text>
          <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyKey(v)} />
        </Space>
      )
    },
    { title: 'Estado', render: (_, r) => statusTag(r) },
    { title: 'Vence', dataIndex: 'vence_en', render: v => dayjs(v).format('DD/MM/YYYY'), sorter: (a, b) => new Date(a.vence_en) - new Date(b.vence_en) },
    { title: 'Última conexión', render: (_, r) => lastCheckTag(r) },
    { title: 'Días gracia', dataIndex: 'grace_days', align: 'center' },
    { title: 'Activa', dataIndex: 'activo', align: 'center', render: (v, r) => <Switch checked={v} size="small" onChange={() => toggleActivo(r)} /> },
    {
      title: 'Acciones', key: 'acc', align: 'center', width: 120,
      render: (_, r) => (
        <Space>
          <Popconfirm
            title={`¿Extender hasta ${dayjs(new Date(r.vence_en) > new Date() ? r.vence_en : new Date()).add(1, 'month').format('DD/MM/YYYY')}?`}
            onConfirm={() => extenderUnMes(r)}
            okText="Sí"
            cancelText="No"
          >
            <Button size="small" type="primary" icon={<PlusCircleOutlined />} title="+1 mes" />
          </Popconfirm>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title="¿Eliminar esta licencia?" onConfirm={() => handleDelete(r.id)} okText="Sí" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Licencias</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Actualizar</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Nueva licencia</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { title: 'Total', value: data.length, color: undefined },
          { title: 'Activas', value: activas, color: '#52c41a' },
          { title: 'Vencidas', value: vencidas, color: '#faad14' },
          { title: 'Desactivadas', value: desactivas, color: '#ff4d4f' }
        ].map(s => (
          <Col span={6} key={s.title}>
            <Card size="small">
              <Statistic title={s.title} value={s.value} valueStyle={s.color ? { color: s.color } : undefined} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        open={modal.open}
        title={modal.record ? 'Editar licencia' : 'Nueva licencia'}
        onOk={newKey ? () => setModal({ open: false, record: null }) : handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText={newKey ? 'Cerrar' : 'Guardar'}
        cancelButtonProps={newKey ? { style: { display: 'none' } } : undefined}
        destroyOnHidden
      >
        {newKey ? (
          <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
            <Alert
              type="success"
              message="Licencia creada correctamente"
              description="Enviá esta clave al cliente. Solo se muestra una vez."
              showIcon
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text code style={{ fontSize: 20, letterSpacing: 3 }}>{newKey}</Text>
            </div>
            <Button block icon={<CopyOutlined />} onClick={() => copyKey(newKey)}>
              Copiar clave
            </Button>
          </Space>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="cliente_nombre" label="Nombre del cliente" rules={[{ required: true }]}>
              <Input placeholder="Ej: Florería Martínez" />
            </Form.Item>
            <Form.Item name="vence_en" label="Fecha de vencimiento" rules={[{ required: true }]}>
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                renderExtraFooter={() => (
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusCircleOutlined />}
                    onClick={() => {
                      const current = form.getFieldValue('vence_en')
                      const base = current && current.isAfter(dayjs()) ? current : dayjs()
                      form.setFieldValue('vence_en', base.add(1, 'month'))
                    }}
                  >
                    +1 mes desde hoy / vencimiento
                  </Button>
                )}
              />
            </Form.Item>
            <Form.Item name="grace_days" label="Días de gracia sin conexión">
              <InputNumber min={0} max={30} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notas" label="Notas">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="activo" label="Activa" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Divider style={{ margin: '12px 0' }} />
            <Form.Item name="features" label="Módulos habilitados">
              <Checkbox.Group>
                <Row gutter={[8, 8]}>
                  {ALL_FEATURES.map(f => (
                    <Col span={12} key={f.key}>
                      <Checkbox value={f.key}>{f.label}</Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}
