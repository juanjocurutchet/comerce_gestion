import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Table, Button, Space, Typography, Tag, Card, Modal, Form,
  Input, DatePicker, Switch, InputNumber, Popconfirm, message,
  Row, Col, Statistic, Alert, Checkbox, Divider, Tabs, AutoComplete
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined, PlusCircleOutlined, LinkOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { useClientStore } from '../store/clientStore'

const { Title, Text } = Typography

const ALL_FEATURES = [
  { key: 'ventas',        labelKey: 'licencias.features.ventas' },
  { key: 'cotizaciones',  labelKey: 'licencias.features.cotizaciones' },
  { key: 'productos',     labelKey: 'licencias.features.productos' },
  { key: 'stock',         labelKey: 'licencias.features.stock' },
  { key: 'proveedores',   labelKey: 'licencias.features.proveedores' },
  { key: 'caja',          labelKey: 'licencias.features.caja' },
  { key: 'reportes',      labelKey: 'licencias.features.reportes' },
  { key: 'usuarios',      labelKey: 'licencias.features.usuarios' },
  { key: 'backup',        labelKey: 'licencias.features.backup' },
  { key: 'configuracion', labelKey: 'licencias.features.configuracion' }
]

const DEFAULT_FEATURES = Object.fromEntries(ALL_FEATURES.map(f => [f.key, true]))

const Licencias = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [newKey, setNewKey] = useState(null)
  const [form] = Form.useForm()
  const { t } = useTranslation()
  const publicDemoUrl = useClientStore((s) => s.publicDemoUrl)
  const [activeTab, setActiveTab] = useState('licenses')
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [commerces, setCommerces] = useState([])

  const load = async () => {
    setLoading(true)
    const res = await window.api.license.getAll()
    if (res.ok) setData(res.data)
    else message.error(res.error)
    setLoading(false)
  }

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true)
    const res = await window.api.license.listUpgradeRequests()
    if (res.ok) setLeads(res.data || [])
    else message.error(res.error)
    setLeadsLoading(false)
  }, [])

  const loadCommerces = useCallback(async () => {
    const res = await window.api.license.listCommerces()
    if (res.ok) setCommerces(res.data || [])
  }, [])

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (activeTab === 'leads') loadLeads()
  }, [activeTab, loadLeads])

  useEffect(() => {
    if (modal.open && !newKey) loadCommerces()
  }, [modal.open, newKey, loadCommerces])

  const openModal = (record = null) => {
    setNewKey(null)
    setModal({ open: true, record })
    if (record) {
      const features = record.features ? Object.keys(record.features).filter(k => record.features[k]) : Object.keys(DEFAULT_FEATURES)
      form.setFieldsValue({
        ...record,
        vence_en: dayjs(record.vence_en),
        features,
        es_demo: !!record.es_demo,
        commerce_id: record.commerce_id || undefined
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        activo: true,
        grace_days: 15,
        features: Object.keys(DEFAULT_FEATURES),
        es_demo: true
      })
    }
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const featuresObj = Object.fromEntries(ALL_FEATURES.map(f => [f.key, (values.features || []).includes(f.key)]))
    const payload = {
      cliente_nombre: values.cliente_nombre,
      vence_en: values.vence_en.format('YYYY-MM-DD'),
      grace_days: values.grace_days,
      notas: values.notas ?? '',
      activo: values.activo,
      features: featuresObj,
      es_demo: !!values.es_demo,
      commerce_id: values.commerce_id?.trim() ? values.commerce_id.trim() : null
    }
    const res = modal.record
      ? await window.api.license.update(modal.record.id, payload)
      : await window.api.license.create(payload)

    if (res.ok) {
      if (!modal.record) {
        setNewKey(res.data?.clave)
      } else {
        message.success(t('licencias.updatedMsg'))
        setModal({ open: false, record: null })
      }
      load()
    } else {
      message.error(res.error)
    }
  }

  const extenderUnMes = async (record) => {
    const base = new Date(record.vence_en) > new Date() ? new Date(record.vence_en) : new Date()
    base.setMonth(base.getMonth() + 1)
    const nuevaFecha = base.toISOString().split('T')[0]
    const res = await window.api.license.update(record.id, { vence_en: nuevaFecha, activo: true })
    if (res.ok) { message.success(t('licencias.extendSuccess', { date: dayjs(nuevaFecha).format('DD/MM/YYYY') })); load() }
    else message.error(res.error)
  }

  const toggleActivo = async (record) => {
    const res = await window.api.license.update(record.id, { activo: !record.activo })
    if (res.ok) { message.success(record.activo ? t('licencias.deactivatedMsg') : t('licencias.activatedMsg')); load() }
    else message.error(res.error)
  }

  const handleDelete = async (id) => {
    const res = await window.api.license.delete(id)
    if (res.ok) { message.success(t('licencias.deletedMsg')); load() }
    else message.error(res.error)
  }

  const copyKey = (key) => {
    navigator.clipboard.writeText(key)
    message.success(t('licencias.keyCopied'))
  }

  const copyDemoUrl = () => {
    if (!publicDemoUrl?.trim()) return
    navigator.clipboard.writeText(publicDemoUrl.trim())
    message.success(t('licencias.demoUrlCopied'))
  }

  const statusTag = (row) => {
    if (!row.activo) return <Tag color="red">{t('licencias.statusDisabled')}</Tag>
    const days = Math.ceil((new Date(row.vence_en) - Date.now()) / 86400000)
    if (days < 0) return <Tag color="volcano">{t('licencias.statusExpired')}</Tag>
    if (days <= 7) return <Tag color="orange">{t('licencias.statusExpiresIn', { days })}</Tag>
    return <Tag color="green">{t('licencias.statusActive')}</Tag>
  }

  const lastCheckTag = (row) => {
    if (!row.last_check) return <Tag color="default">{t('licencias.lastCheckNever')}</Tag>
    const days = Math.floor((Date.now() - new Date(row.last_check).getTime()) / 86400000)
    if (days === 0) return <Tag color="green">{t('licencias.lastCheckToday')}</Tag>
    if (days <= 7) return <Tag color="blue">{days}d</Tag>
    if (days <= 15) return <Tag color="orange">{days}d</Tag>
    return <Tag color="red">{days}d</Tag>
  }

  const activas    = data.filter(r => r.activo && new Date(r.vence_en) > new Date()).length
  const vencidas   = data.filter(r => new Date(r.vence_en) < new Date()).length
  const desactivas = data.filter(r => !r.activo).length

  const commerceOptions = useMemo(() => (commerces || []).map((c) => ({
    value: c.id,
    label: `${c.id} — ${c.nombre}`
  })), [commerces])


  const columns = [
    { title: t('licencias.colClient'), dataIndex: 'cliente_nombre', sorter: (a, b) => a.cliente_nombre.localeCompare(b.cliente_nombre) },
    {
      title: t('licencias.colDemo'),
      dataIndex: 'es_demo',
      align: 'center',
      width: 90,
      render: (v) => (v ? <Tag color="purple">{t('licencias.demoTag')}</Tag> : <Tag>{t('licencias.paidTag')}</Tag>)
    },
    {
      title: t('licencias.colKey'), dataIndex: 'clave',
      render: v => (
        <Space>
          <Text code style={{ fontSize: 12 }}>{v}</Text>
          <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyKey(v)} />
        </Space>
      )
    },
    { title: t('licencias.colStatus'), render: (_, r) => statusTag(r) },
    { title: t('licencias.colExpiry'), dataIndex: 'vence_en', render: v => dayjs(v).format('DD/MM/YYYY'), sorter: (a, b) => new Date(a.vence_en) - new Date(b.vence_en) },
    {
      title: t('licencias.colCommerceId'),
      dataIndex: 'commerce_id',
      ellipsis: true,
      render: (v) => (v ? <Text code>{v}</Text> : <Text type="secondary">—</Text>)
    },
    { title: t('licencias.colLastCheck'), render: (_, r) => lastCheckTag(r) },
    { title: t('licencias.colGraceDays'), dataIndex: 'grace_days', align: 'center' },
    { title: t('licencias.colActive'), dataIndex: 'activo', align: 'center', render: (v, r) => <Switch checked={v} size="small" onChange={() => toggleActivo(r)} /> },
    {
      title: t('licencias.colActions'), key: 'acc', align: 'center', width: 120,
      render: (_, r) => (
        <Space>
          <Popconfirm
            title={t('licencias.extendConfirm', { date: dayjs(new Date(r.vence_en) > new Date() ? r.vence_en : new Date()).add(1, 'month').format('DD/MM/YYYY') })}
            onConfirm={() => extenderUnMes(r)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Button size="small" type="primary" icon={<PlusCircleOutlined />} title="+1 mes" />
          </Popconfirm>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title={t('licencias.deleteConfirm')} onConfirm={() => handleDelete(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const leadColumns = [
    { title: t('licencias.colLeadRequestedAt'), dataIndex: 'requested_at', width: 170, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—') },
    { title: t('licencias.colLeadClientName'), dataIndex: 'client_name', ellipsis: true },
    { title: t('licencias.colLeadContactName'), dataIndex: 'contact_name', ellipsis: true },
    { title: t('licencias.colLeadEmail'), dataIndex: 'contact_email', ellipsis: true },
    { title: t('licencias.colLeadPhone'), dataIndex: 'contact_phone', width: 120, ellipsis: true },
    { title: t('licencias.colLeadSize'), dataIndex: 'commerce_size', ellipsis: true },
    { title: t('licencias.colLeadDaysLeft'), dataIndex: 'current_days_left', width: 90, align: 'center' },
    { title: t('licencias.colLeadSource'), dataIndex: 'source', width: 90 }
  ]

  const licensePanel = (
    <div>
      {publicDemoUrl?.trim() ? (
        <Alert
          type="info"
          showIcon
          icon={<LinkOutlined />}
          style={{ marginBottom: 16 }}
          message={t('licencias.demoUrlAlertTitle')}
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text copyable>{publicDemoUrl.trim()}</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={copyDemoUrl}>{t('licencias.demoUrlCopy')}</Button>
            </Space>
          }
        />
      ) : (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={t('licencias.demoUrlMissingTitle')} description={t('licencias.demoUrlMissingDesc')} />
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('licencias.title')}</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>{t('common.refresh')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('licencias.newLicense')}</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { titleKey: 'licencias.statTotal', value: data.length, color: undefined },
          { titleKey: 'licencias.statActive', value: activas, color: '#52c41a' },
          { titleKey: 'licencias.statExpired', value: vencidas, color: '#faad14' },
          { titleKey: 'licencias.statDisabled', value: desactivas, color: '#ff4d4f' }
        ].map(s => (
          <Col xs={24} sm={12} md={6} key={s.titleKey}>
            <Card size="small">
              <Statistic title={t(s.titleKey)} value={s.value} valueStyle={s.color ? { color: s.color } : undefined} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} scroll={{ x: 1100 }} />
      </Card>
    </div>
  )

  const leadsPanel = (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('licencias.leadsTitle')}</Title>
        <Button icon={<ReloadOutlined />} onClick={loadLeads}>{t('common.refresh')}</Button>
      </div>
      <Alert type="info" showIcon style={{ margin: '12px 0 16px' }} message={t('licencias.leadsHint')} />
      <Card>
        <Table
          columns={leadColumns}
          dataSource={leads}
          rowKey="id"
          loading={leadsLoading}
          size="small"
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: t('licencias.leadsEmpty') }}
        />
      </Card>
    </div>
  )

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'licenses', label: t('licencias.tabLicenses'), children: licensePanel },
          { key: 'leads', label: t('licencias.tabLeads'), children: leadsPanel }
        ]}
      />

      <Modal
        open={modal.open}
        title={modal.record ? t('licencias.editLicense') : t('licencias.newLicense')}
        onOk={newKey ? () => setModal({ open: false, record: null }) : handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText={newKey ? t('common.close') : t('common.save')}
        cancelButtonProps={newKey ? { style: { display: 'none' } } : undefined}
        destroyOnHidden
        width={560}
      >
        {newKey ? (
          <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
            <Alert
              type="success"
              message={t('licencias.createdAlert')}
              description={t('licencias.createdDesc')}
              showIcon
            />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text code style={{ fontSize: 20, letterSpacing: 3 }}>{newKey}</Text>
            </div>
            <Button block icon={<CopyOutlined />} onClick={() => copyKey(newKey)}>
              {t('common.copyKey')}
            </Button>
          </Space>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="cliente_nombre" label={t('licencias.fieldClient')} rules={[{ required: true }]}>
              <Input placeholder={t('licencias.clientPlaceholder')} />
            </Form.Item>
            <Form.Item name="es_demo" label={t('licencias.fieldEsDemo')} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 12, fontSize: 12 }}>
              {t('licencias.fieldEsDemoHint')}
            </Text>
            <Form.Item name="commerce_id" label={t('licencias.fieldCommerceId')}>
              <AutoComplete
                allowClear
                options={commerceOptions}
                placeholder={t('licencias.fieldCommercePlaceholder')}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Text type="secondary" style={{ display: 'block', marginTop: -12, marginBottom: 12, fontSize: 12 }}>
              {t('licencias.fieldCommerceIdHint')}
            </Text>
            <Form.Item name="vence_en" label={t('licencias.fieldExpiry')} rules={[{ required: true }]}>
              <DatePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                renderExtraFooter={() => (
                  <Space wrap>
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
                      {t('licencias.addOneMonth')}
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => form.setFieldValue('vence_en', dayjs().add(10, 'day'))}
                    >
                      {t('licencias.addTenDaysDemo')}
                    </Button>
                  </Space>
                )}
              />
            </Form.Item>
            <Form.Item name="grace_days" label={t('licencias.fieldGraceDays')}>
              <InputNumber min={0} max={30} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="notas" label={t('licencias.fieldNotes')}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="activo" label={t('licencias.fieldActive')} valuePropName="checked">
              <Switch />
            </Form.Item>
            <Divider style={{ margin: '12px 0' }} />
            <Form.Item name="features" label={t('licencias.fieldModules')}>
              <Checkbox.Group>
                <Row gutter={[8, 8]}>
                  {ALL_FEATURES.map(f => (
                    <Col span={12} key={f.key}>
                      <Checkbox value={f.key}>{t(f.labelKey)}</Checkbox>
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

export default Licencias
