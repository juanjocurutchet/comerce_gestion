import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Typography, Tag, Modal,
  Form, Input, InputNumber, Select, DatePicker, Popconfirm, message, Row, Col, Statistic
} from 'antd'
import { PlusOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import useExport from '../hooks/useExport'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const CATEGORIAS = ['alquiler', 'servicios', 'mercaderia', 'sueldos', 'impuestos', 'otros']

const Gastos = () => {
  const [gastos, setGastos] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [rango, setRango] = useState(null)
  const [form] = Form.useForm()
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()
  const { exportToExcel, exporting } = useExport()

  const loadGastos = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    const desde = rango?.[0]?.format('YYYY-MM-DD')
    const hasta = rango?.[1]?.format('YYYY-MM-DD')
    const res = await window.api.gastos.getAll(desde, hasta, {
      paginate: true,
      page,
      pageSize
    })
    const data = res.data || {}
    setGastos(data.items || [])
    setPagination((prev) => ({
      ...prev,
      current: data.page || page,
      pageSize: data.pageSize || pageSize,
      total: data.total || 0
    }))
    setLoading(false)
  }

  useEffect(() => { loadGastos(1, pagination.pageSize) }, [rango])

  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    const res = await window.api.gastos.create(
      { ...values, fecha: values.fecha ? values.fecha.format('YYYY-MM-DD HH:mm:ss') : null },
      user?.id
    )
    setLoading(false)
    if (!res.ok) { message.error(res.error); return }
    message.success(t('gastos.saveSuccess'))
    setModal(false)
    loadGastos()
  }

  const handleDelete = async (id) => {
    const res = await window.api.gastos.delete(id)
    if (res.ok) { message.success(t('gastos.deleteSuccess')); loadGastos() }
    else message.error(res.error)
  }

  const handleExport = async () => {
    const desde = rango?.[0]?.format('YYYY-MM-DD')
    const hasta = rango?.[1]?.format('YYYY-MM-DD')
    const res = await window.api.gastos.getAll(desde, hasta)
    const allGastos = res.data || []
    const cols = [
      { header: t('gastos.colDate'), key: 'fecha' },
      { header: t('gastos.colCategory'), key: 'categoria' },
      { header: t('gastos.colDesc'), key: 'descripcion' },
      { header: t('gastos.colAmount'), key: 'monto' },
      { header: t('gastos.colUser'), key: 'usuario_nombre' }
    ]
    exportToExcel(cols, allGastos, 'gastos')
  }

  const total = gastos.reduce((a, g) => a + g.monto, 0)

  const handleTableChange = (nextPagination) => {
    loadGastos(nextPagination.current, nextPagination.pageSize)
  }

  const handleRangeChange = (values) => {
    setRango(values)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const clearRange = () => {
    setRango(null)
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  const columns = [
    {
      title: t('gastos.colDate'), dataIndex: 'fecha', width: 140,
      render: v => dayjs(v).format('DD/MM/YY HH:mm'),
      sorter: (a, b) => a.fecha.localeCompare(b.fecha),
      defaultSortOrder: 'descend'
    },
    {
      title: t('gastos.colCategory'), dataIndex: 'categoria', width: 130,
      render: v => <Tag color="blue">{t(`gastos.cat.${v}`)}</Tag>
    },
    { title: t('gastos.colDesc'), dataIndex: 'descripcion', ellipsis: true },
    {
      title: t('gastos.colAmount'), dataIndex: 'monto', align: 'right', width: 110,
      render: v => <Text strong style={{ color: '#ff4d4f' }}>${v.toFixed(2)}</Text>,
      sorter: (a, b) => b.monto - a.monto
    },
    { title: t('gastos.colUser'), dataIndex: 'usuario_nombre', width: 120, render: v => v || '—' },
    {
      key: 'del', width: 50, align: 'center',
      render: (_, r) => (
        <Popconfirm title={t('gastos.deleteConfirm')} onConfirm={() => handleDelete(r.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Title level={4} style={{ margin: 0 }}>{t('gastos.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setModal(true); form.resetFields() }}>
          {t('gastos.newExpense')}
        </Button>
        <Space wrap>
          <RangePicker
            value={rango}
            format="DD/MM/YYYY"
            onChange={handleRangeChange}
            allowEmpty={[true, true]}
          />
          <Button onClick={clearRange}>{t('common.showAll')}</Button>
        </Space>
        <Button icon={<FileExcelOutlined />} onClick={handleExport} loading={exporting}>
          {t('common.exportExcel')}
        </Button>
        {total > 0 && (
          <Text style={{ marginLeft: 8 }}>
            {t('gastos.totalPeriod')}: <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>${total.toFixed(2)}</Text>
          </Text>
        )}
      </div>

      <Card
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'auto', padding: 16 } }}
      >
        <Table
          columns={columns}
          dataSource={gastos}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          size="small"
          locale={{ emptyText: t('gastos.noExpenses') }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true
          }}
        />
      </Card>

      <Modal
        title={t('gastos.newExpense')}
        open={modal}
        onOk={handleSave}
        onCancel={() => setModal(false)}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}
          initialValues={{ fecha: dayjs(), categoria: 'otros' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="monto" label={t('gastos.amountLabel')} rules={[{ required: true }]}>
                <InputNumber min={0.01} precision={2} prefix="$" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoria" label={t('gastos.categoryLabel')} rules={[{ required: true }]}>
                <Select options={CATEGORIAS.map(c => ({ value: c, label: t(`gastos.cat.${c}`) }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="descripcion" label={t('gastos.descLabel')} rules={[{ required: true }]}>
            <Input placeholder={t('gastos.descPlaceholder')} />
          </Form.Item>
          <Form.Item name="fecha" label={t('gastos.dateLabel')}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Gastos
