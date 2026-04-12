import React, { useEffect, useState } from 'react'
import {
  Card, Form, Input, Button, Typography, message, Divider,
  Table, Space, Modal, Popconfirm, Alert, Row, Col
} from 'antd'
import { ShopOutlined, SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, ClearOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useClientStore } from '../store/clientStore'

const { Title, Text } = Typography

const GestionCategorias = () => {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [form] = Form.useForm()
  const { t } = useTranslation()

  useEffect(() => { loadCategorias() }, [])

  const loadCategorias = async () => {
    setLoading(true)
    const res = await window.api.categorias.getAll()
    setCategorias(res.data || [])
    setLoading(false)
  }

  const openModal = (record = null) => {
    setModal({ open: true, record })
    record ? form.setFieldsValue(record) : form.resetFields()
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    const res = modal.record
      ? await window.api.categorias.update({ ...values, id: modal.record.id })
      : await window.api.categorias.create(values)
    if (res.ok) {
      message.success(modal.record ? t('configuracion.catSaveSuccess', { action: t('configuracion.catUpdated') }) : t('configuracion.catSaveSuccess', { action: t('configuracion.catCreated') }))
      setModal({ open: false, record: null })
      loadCategorias()
    } else {
      message.error(res.error || t('common.error'))
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.categorias.delete(id)
    if (res.ok) { message.success(t('configuracion.catDeleteSuccess')); loadCategorias() }
    else message.error(res.error || t('configuracion.catDeleteError'))
  }

  const columns = [
    { title: t('configuracion.fieldCatName'), dataIndex: 'nombre' },
    { title: t('configuracion.fieldCatDesc'), dataIndex: 'descripcion', render: v => v || <Text type="secondary">—</Text> },
    {
      title: t('common.actions'), key: 'acc', width: 100, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm
            title={t('configuracion.catDeleteConfirm')}
            description={t('configuracion.catDeleteDesc')}
            onConfirm={() => handleDelete(r.id)}
            okText={t('common.yes')} cancelText={t('common.no')}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          {t('configuracion.newCategory')}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={categorias}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: t('configuracion.catEmpty') }}
      />
      <Modal
        title={modal.record ? t('configuracion.editCategory') : t('configuracion.newCategory')}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label={t('configuracion.fieldCatName')} rules={[{ required: true, message: t('configuracion.catNameRequired') }]}>
            <Input placeholder={t('configuracion.catNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="descripcion" label={t('configuracion.fieldCatDesc')}>
            <Input.TextArea rows={2} placeholder={t('configuracion.catDescPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

const DatosDemoAdmin = ({ onRefresh }) => {
  const [loading, setLoading] = useState({ run: false, clear: false })
  const { t } = useTranslation()

  const cargarDemo = async () => {
    setLoading(l => ({ ...l, run: true }))
    const res = await window.api.seed.run()
    setLoading(l => ({ ...l, run: false }))
    if (res.ok) {
      const { creados, omitidos, categorias, proveedores } = res.data
      message.success(t('configuracion.loadDemoSuccess', { creados, omitidos, categorias, proveedores }))
      onRefresh?.()
    } else {
      message.error(res.error || t('common.error'))
    }
  }

  const limpiarDemo = async () => {
    setLoading(l => ({ ...l, clear: true }))
    const res = await window.api.seed.clear()
    setLoading(l => ({ ...l, clear: false }))
    if (res.ok) {
      message.success(t('configuracion.clearDemoSuccess', { eliminados: res.data.eliminados }))
      onRefresh?.()
    } else {
      message.error(res.error || t('common.error'))
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message={t('configuracion.demoInfo')}
        description={t('configuracion.demoDescription')}
      />
      <Space>
        <Button
          icon={<DatabaseOutlined />}
          type="primary"
          loading={loading.run}
          onClick={cargarDemo}
        >
          {t('configuracion.loadDemo')}
        </Button>
        <Popconfirm
          title={t('configuracion.clearDemoConfirm')}
          description={t('configuracion.clearDemoDesc')}
          onConfirm={limpiarDemo}
          okText={t('configuracion.clearDemoOk')}
          cancelText={t('common.cancel')}
        >
          <Button icon={<ClearOutlined />} danger loading={loading.clear}>
            {t('configuracion.clearDemo')}
          </Button>
        </Popconfirm>
      </Space>
    </Space>
  )
}

const Configuracion = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [catKey, setCatKey] = useState(0)
  const isAdmin = useClientStore(s => s.isAdmin)
  const { t } = useTranslation()

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    const res = await window.api.config.getAll()
    if (res.ok && res.data) form.setFieldsValue(res.data)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    const res = await window.api.config.setMany(values)
    setLoading(false)
    if (res.ok) message.success(t('configuracion.saveSuccess'))
    else message.error(res.error || t('common.error'))
  }

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>{t('configuracion.title')}</Title>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><ShopOutlined style={{ marginRight: 8 }} />{t('configuracion.commerceDataTitle')}</>}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {t('configuracion.commerceDataSubtitle')}
            </Text>
            <Form form={form} layout="vertical">
              <Form.Item name="nombreComercio" label={t('configuracion.fieldCommerceName')} rules={[{ required: true }]}>
                <Input placeholder={t('configuracion.commerceNamePlaceholder')} />
              </Form.Item>
              <Form.Item name="direccion" label={t('configuracion.fieldAddress')}>
                <Input placeholder={t('configuracion.addressPlaceholder')} />
              </Form.Item>
              <Form.Item name="telefono" label={t('configuracion.fieldPhone')}>
                <Input placeholder={t('configuracion.phonePlaceholder')} />
              </Form.Item>
              <Form.Item name="cuit" label={t('configuracion.fieldCuit')}>
                <Input placeholder={t('configuracion.cuitPlaceholder')} />
              </Form.Item>
              <Divider />
              <Form.Item name="ticketFooter" label={t('configuracion.fieldTicketFooter')}>
                <Input placeholder={t('configuracion.ticketFooterPlaceholder')} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
                  {t('configuracion.saveConfig')}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {isAdmin && (
            <Card title={t('configuracion.demoTitle')} style={{ marginTop: 16 }}>
              <DatosDemoAdmin onRefresh={() => setCatKey(k => k + 1)} />
            </Card>
          )}
        </Col>

        <Col xs={24} lg={12}>
          <Card title={t('configuracion.categoriesTitle')}>
            <GestionCategorias key={catKey} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Configuracion
