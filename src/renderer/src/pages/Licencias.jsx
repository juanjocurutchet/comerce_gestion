import React, { useEffect, useState } from 'react'
import {
  Table, Button, Space, Typography, Tag, Card, Modal, Form,
  Input, DatePicker, Switch, InputNumber, Popconfirm, message, Tooltip, Row, Col, Statistic
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function statusTag(row) {
  if (!row.activo) return <Tag color="red">Desactivada</Tag>
  const days = Math.ceil((new Date(row.vence_en) - Date.now()) / 86400000)
  if (days < 0) return <Tag color="volcano">Vencida</Tag>
  if (days <= 7) return <Tag color="orange">Vence en {days}d</Tag>
  return <Tag color="green">Activa</Tag>
}

function daysOfflineTag(row) {
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
    setModal({ open: true, record })
    if (record) {
      form.setFieldsValue({
        ...record,
        vence_en: dayjs(record.vence_en),
        activo: record.activo
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ activo: true, grace_days: 15 })
    }
  }

  async function handleSave() {
    const values = await form.validateFields()
    const payload = {
      ...values,
      vence_en: values.vence_en.format('YYYY-MM-DD')
    }
    const res = modal.record
      ? await window.api.license.update(modal.record.id, payload)
      : await window.api.license.create(payload)

    if (res.ok) {
      message.success(modal.record ? 'Licencia actualizada' : 'Licencia creada')
      setModal({ open: false, record: null })
      load()
    } else {
      message.error(res.error)
    }
  }

  async function toggleActivo(record) {
    const res = await window.api.license.update(record.id, { activo: !record.activo })
    if (res.ok) {
      message.success(record.activo ? 'Licencia desactivada' : 'Licencia activada')
      load()
    } else {
      message.error(res.error)
    }
  }

  async function handleDelete(id) {
    const res = await window.api.license.delete(id)
    if (res.ok) { message.success('Licencia eliminada'); load() }
    else message.error(res.error)
  }

  const activas = data.filter(r => r.activo && new Date(r.vence_en) > new Date()).length
  const vencidas = data.filter(r => new Date(r.vence_en) < new Date()).length
  const desactivadas = data.filter(r => !r.activo).length

  const columns = [
    {
      title: 'Cliente', dataIndex: 'cliente_nombre', sorter: (a, b) => a.cliente_nombre.localeCompare(b.cliente_nombre)
    },
    {
      title: 'Machine ID', dataIndex: 'machine_id',
      render: v => (
        <Space>
          <Text code style={{ fontSize: 11 }}>{v.slice(0, 16)}…</Text>
          <Tooltip title="Copiar">
            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(v); message.success('Copiado') }} />
          </Tooltip>
        </Space>
      )
    },
    { title: 'Estado', render: (_, r) => statusTag(r) },
    {
      title: 'Vence', dataIndex: 'vence_en',
      render: v => dayjs(v).format('DD/MM/YYYY'),
      sorter: (a, b) => new Date(a.vence_en) - new Date(b.vence_en)
    },
    {
      title: 'Última conexión', dataIndex: 'last_check',
      render: (v, r) => daysOfflineTag(r)
    },
    { title: 'Días gracia', dataIndex: 'grace_days', align: 'center' },
    {
      title: 'Activa', dataIndex: 'activo', align: 'center',
      render: (v, r) => (
        <Switch checked={v} size="small" onChange={() => toggleActivo(r)} />
      )
    },
    {
      title: 'Acciones', key: 'acc', align: 'center', width: 100,
      render: (_, r) => (
        <Space>
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
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total" value={data.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Activas" value={activas} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Vencidas" value={vencidas} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Desactivadas" value={desactivadas} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        open={modal.open}
        title={modal.record ? 'Editar licencia' : 'Nueva licencia'}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="cliente_nombre" label="Nombre del cliente" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="machine_id" label="Machine ID" rules={[{ required: true }]}>
            <Input placeholder="ID único del equipo del cliente" />
          </Form.Item>
          <Form.Item name="vence_en" label="Fecha de vencimiento" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
        </Form>
      </Modal>
    </div>
  )
}
