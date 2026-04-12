import React, { useEffect, useState, useRef } from 'react'
import {
  Table, Button, Space, Typography, Input, Modal, Form,
  Select, InputNumber, Tag, Popconfirm, message, Row, Col,
  Card, Tooltip, AutoComplete, DatePicker
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  BarcodeOutlined, ScanOutlined, ExclamationCircleOutlined, CalendarOutlined
} from '@ant-design/icons'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const Productos = () => {
  const [data, setData] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState({ open: false, record: null })
  const [scanned, setScanned] = useState(false)
  const [nombreSugerencias, setNombreSugerencias] = useState([])
  const [form] = Form.useForm()
  const codigoInputRef = useRef()
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [p, c, pr] = await Promise.all([
      window.api.productos.getAll(),
      window.api.categorias.getAll(),
      window.api.proveedores.getAll()
    ])
    setData(p.data || [])
    setCategorias(c.data || [])
    setProveedores(pr.data || [])
    setLoading(false)
  }

  const openModal = (record = null) => {
    setModal({ open: true, record })
    setScanned(false)
    setNombreSugerencias([])
    if (record) {
      form.setFieldsValue({
        ...record,
        fecha_vencimiento: record.fecha_vencimiento ? dayjs(record.fecha_vencimiento) : null
      })
    } else {
      form.resetFields()
    }
  }

  const onNombreSearch = (text) => {
    if (!text || text.length < 2) {
      setNombreSugerencias([])
      return
    }
    const lower = text.toLowerCase()
    const matches = data
      .filter(p => p.nombre?.toLowerCase().includes(lower))
      .slice(0, 8)
      .map(p => ({
        value: p.nombre,
        label: (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>{p.nombre}</span>
            <Space size={4}>
              {p.codigo && <Tag style={{ fontSize: 11 }}>{p.codigo}</Tag>}
              <Tag color={p.stock_actual <= 0 ? 'error' : p.stock_actual <= p.stock_minimo ? 'warning' : 'success'}>
                Stock: {p.stock_actual}
              </Tag>
            </Space>
          </Space>
        ),
        producto: p
      }))
    setNombreSugerencias(matches)
  }

  const onNombreSelect = (value, option) => {
    if (option.producto && !modal.record) {
      const p = option.producto
      Modal.confirm({
        title: t('productos.dupExistingProduct'),
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>{t('productos.dupQuestion', { nombre: p.nombre, stock: p.stock_actual, unit: p.unidad })}</p>
            <p style={{ marginTop: 8 }}>{t('productos.dupAddStock')}</p>
          </div>
        ),
        okText: t('productos.dupYesAddStock'),
        cancelText: t('productos.dupNoCreate'),
        onOk: () => {
          setModal({ open: true, record: p })
          form.setFieldsValue(p)
          setNombreSugerencias([])
        },
        onCancel: () => setNombreSugerencias([])
      })
    }
  }

  useBarcodeScanner(
    (code) => {
      form.setFieldValue('codigo', code)
      setScanned(true)
      setTimeout(() => setScanned(false), 2000)
      message.success({ content: t('productos.scannedConfirm', { code }), key: 'scan', duration: 2 })
      const nombre = form.getFieldValue('nombre')
      if (!nombre) {
        setTimeout(() => document.querySelector('.nombre-autocomplete input')?.focus(), 50)
      }
    },
    { enabled: modal.open, minLength: 3, maxDelay: 50 }
  )

  const handleSave = async () => {
    const values = await form.validateFields()
    if (values.fecha_vencimiento) {
      values.fecha_vencimiento = values.fecha_vencimiento.format('YYYY-MM-DD')
    } else {
      values.fecha_vencimiento = null
    }

    if (modal.record) {
      const { _agregarStock, ...rest } = values
      const res = await window.api.productos.update({ ...rest, id: modal.record.id })
      if (!res.ok) { message.error(res.error || t('productos.saveErrorDefault')); return }

      if (_agregarStock > 0) {
        const fechaVencLote = values._fechaVencLote ? values._fechaVencLote.format('YYYY-MM-DD') : null
        const r = await window.api.productos.sumarStock(modal.record.id, _agregarStock, user?.id, fechaVencLote)
        if (r.ok) {
          message.success(t('productos.updatedWithStock', { qty: _agregarStock, total: r.data }))
        } else {
          message.warning(t('productos.updatedStockError', { error: r.error }))
        }
      } else {
        message.success(t('productos.updated'))
      }
      setModal({ open: false, record: null })
      loadAll()
      return
    }

    const dupRes = await window.api.productos.findDuplicate(values.nombre, values.codigo || null)
    const dup = dupRes.data

    if (dup) {
      Modal.confirm({
        title: t('productos.dupExistingProduct'),
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              {dup.matchBy === 'codigo'
                ? t('productos.dupFoundCode', { nombre: dup.nombre, code: dup.codigo })
                : t('productos.dupFoundName', { nombre: dup.nombre })}
            </p>
            <p style={{ marginTop: 8 }}>
              {t('productos.dupCurrentStock', { stock: dup.stock_actual, unit: dup.unidad })}
              {values.stock_actual > 0 && t('productos.dupWouldBe', { newStock: dup.stock_actual + values.stock_actual, unit: dup.unidad })}
            </p>
            <p style={{ marginTop: 8 }}>{t('productos.dupAddQuestion', { qty: values.stock_actual })}</p>
          </div>
        ),
        okText: t('productos.dupYesSumar'),
        cancelText: t('common.cancel'),
        onOk: async () => {
          if (values.stock_actual > 0) {
            const r = await window.api.productos.sumarStock(dup.id, values.stock_actual, user?.id)
            if (r.ok) {
              message.success(t('productos.stockUpdated', { nombre: dup.nombre, stock: r.data, unit: dup.unidad }))
              setModal({ open: false, record: null })
              loadAll()
            } else {
              message.error(r.error)
            }
          } else {
            message.info(t('productos.stockZeroInfo'))
            setModal({ open: false, record: null })
          }
        }
      })
      return
    }

    const res = await window.api.productos.create(values, user?.id)
    if (res.ok) {
      message.success(t('productos.created'))
      if (values.stock_actual > 0) {
        message.info(t('productos.initialStockInfo', { qty: values.stock_actual }), 3)
      }
      setModal({ open: false, record: null })
      loadAll()
    } else {
      message.error(res.error || t('productos.saveErrorDefault'))
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.productos.delete(id)
    if (res.ok) { message.success(t('productos.deleteSuccess')); loadAll() }
    else message.error(res.error)
  }

  const vencimientoTag = (fecha) => {
    if (!fecha) return null
    const hoy = dayjs()
    const vence = dayjs(fecha)
    const dias = vence.diff(hoy, 'day')
    if (dias < 0) return <Tag color="error" icon={<CalendarOutlined />}>{t('productos.expired')}</Tag>
    if (dias <= 7) return <Tag color="error" icon={<CalendarOutlined />}>{t('productos.expiresIn', { days: dias })}</Tag>
    if (dias <= 30) return <Tag color="warning" icon={<CalendarOutlined />}>{t('productos.expiresIn', { days: dias })}</Tag>
    return <Tag color="default" icon={<CalendarOutlined />}>{vence.format('DD/MM/YY')}</Tag>
  }

  const filtered = data.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria_nombre?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { title: t('productos.colCode'), dataIndex: 'codigo', width: 140, render: v => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : '-' },
    { title: t('productos.colName'), dataIndex: 'nombre', sorter: (a, b) => a.nombre.localeCompare(b.nombre) },
    { title: t('productos.colCategory'), dataIndex: 'categoria_nombre', render: v => v ? <Tag>{v}</Tag> : '-' },
    { title: t('productos.colCost'), dataIndex: 'precio_compra', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: t('productos.colPrice'), dataIndex: 'precio_venta', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    {
      title: t('productos.colStock'), dataIndex: 'stock_actual',
      render: (v, r) => (
        <Tag color={v <= 0 ? 'error' : v <= r.stock_minimo ? 'warning' : 'success'}>
          {v} {r.unidad}
        </Tag>
      ),
      align: 'center'
    },
    { title: t('productos.colSupplier'), dataIndex: 'proveedor_nombre', render: v => v || '-' },
    {
      title: t('productos.colExpiry'), dataIndex: 'fecha_vencimiento',
      render: v => vencimientoTag(v),
      sorter: (a, b) => {
        if (!a.fecha_vencimiento && !b.fecha_vencimiento) return 0
        if (!a.fecha_vencimiento) return 1
        if (!b.fecha_vencimiento) return -1
        return a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)
      }
    },
    {
      title: t('productos.colActions'), key: 'acciones', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title={t('productos.deleteConfirm')} onConfirm={() => handleDelete(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('productos.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          {t('productos.newProduct')}
        </Button>
      </div>

      <Card>
        <Input
          placeholder={t('productos.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
          allowClear
        />
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: total => t('productos.pagTotal', { total }) }}
        />
      </Card>

      <Modal
        title={modal.record ? t('productos.editProduct') : t('productos.newProduct')}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={600}
        destroyOnClose
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 6, marginBottom: 16,
          background: scanned ? '#f6ffed' : 'rgba(22,119,255,0.06)',
          border: `1px solid ${scanned ? '#b7eb8f' : 'rgba(22,119,255,0.2)'}`,
          transition: 'all 0.3s'
        }}>
          <ScanOutlined style={{ color: scanned ? '#52c41a' : '#1677ff', fontSize: 16 }} />
          <Text style={{ fontSize: 12 }}>
            {scanned
              ? <Text style={{ color: '#52c41a', fontSize: 12 }}>{t('productos.scannerScanned')}</Text>
              : <Text type="secondary" style={{ fontSize: 12 }}>{t('productos.scannerWaiting')}</Text>
            }
          </Text>
        </div>

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nombre" label={t('productos.fieldName')} rules={[{ required: true }]}>
                <AutoComplete
                  className="nombre-autocomplete"
                  options={nombreSugerencias}
                  onSearch={onNombreSearch}
                  onSelect={onNombreSelect}
                  popupMatchSelectWidth={400}
                  disabled={!!modal.record}
                >
                  <Input placeholder={t('productos.nameSuggestions')} />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="codigo"
                label={
                  <Space size={6}>
                    {t('productos.fieldCode')}
                    <Tooltip title={t('productos.codeTooltip')}>
                      <BarcodeOutlined style={{ color: '#1677ff', cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <Input
                  ref={codigoInputRef}
                  placeholder={t('productos.codeScanPlaceholder')}
                  style={{ borderColor: scanned ? '#52c41a' : undefined, transition: 'border-color 0.3s' }}
                  suffix={scanned ? <Tag color="success" style={{ margin: 0 }}>{t('productos.scannedStatus')}</Tag> : null}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="categoria_id" label={t('productos.fieldCategory')}>
                <Select placeholder={t('productos.selectCategory')} allowClear
                  options={categorias.map(c => ({ value: c.id, label: c.nombre }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="proveedor_id" label={t('productos.fieldSupplier')}>
                <Select placeholder={t('productos.selectSupplier')} allowClear
                  options={proveedores.map(p => ({ value: p.id, label: p.nombre }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="precio_compra" label={t('productos.fieldCost')} rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="precio_venta" label={t('productos.fieldPrice')} rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unidad" label={t('productos.fieldUnit')} initialValue="unidad">
                <Select options={[
                  { value: 'unidad', label: t('productos.unitUnidad') },
                  { value: 'kg', label: t('productos.unitKg') },
                  { value: 'litro', label: t('productos.unitLitro') },
                  { value: 'metro', label: t('productos.unitMetro') },
                  { value: 'caja', label: t('productos.unitCaja') }
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="stock_actual"
                label={modal.record ? t('productos.fieldStock') : t('productos.fieldInitialStock')}
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} disabled={!!modal.record} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stock_minimo" label={t('productos.fieldMinStock')} initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fecha_vencimiento"
                label={<Space size={4}><CalendarOutlined />{t('productos.fieldExpiry')}</Space>}
                extra={t('productos.expiryExtra')}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder={t('productos.expiryOptional')}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.fecha_vencimiento !== cur.fecha_vencimiento}>
              {({ getFieldValue }) => getFieldValue('fecha_vencimiento') ? (
                <Col span={12}>
                  <Form.Item
                    name="dias_alerta_vencimiento"
                    label={t('productos.fieldAlertDays')}
                    initialValue={7}
                    extra={t('productos.alertDaysExtra')}
                  >
                    <InputNumber min={1} max={365} style={{ width: '100%' }} addonAfter={t('productos.alertDaysSuffix')} />
                  </Form.Item>
                </Col>
              ) : null}
            </Form.Item>
          </Row>
          {modal.record && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="_agregarStock" label={t('productos.fieldAddStock')} initialValue={0}
                  extra={t('productos.addStockExtra')}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Form.Item noStyle shouldUpdate={(p, c) => p._agregarStock !== c._agregarStock}>
                {({ getFieldValue }) => getFieldValue('_agregarStock') > 0 ? (
                  <Col span={12}>
                    <Form.Item name="_fechaVencLote" label={t('productos.fieldLotExpiry')}
                      extra={t('productos.lotExpiryExtra')}>
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={t('productos.expiryOptional')} allowClear />
                    </Form.Item>
                  </Col>
                ) : null}
              </Form.Item>
            </Row>
          )}
          {!modal.record && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              {t('productos.initialStockNote')}
            </Text>
          )}
          <Form.Item name="descripcion" label={t('productos.fieldDescription')}>
            <Input.TextArea rows={2} placeholder={t('productos.descPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Productos
