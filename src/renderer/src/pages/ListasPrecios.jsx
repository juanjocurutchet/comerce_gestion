import React, { useEffect, useState } from 'react'
import {
  Card, Table, Button, Space, Typography, Modal,
  Form, Input, InputNumber, Popconfirm, message, Tag, Select, AutoComplete
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined, TagsOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Title, Text } = Typography

const ListasPrecios = () => {
  const [listas, setListas] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ open: false, record: null })
  const [itemsModal, setItemsModal] = useState({ open: false, lista: null, items: [] })
  const [addItemModal, setAddItemModal] = useState(false)
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [productSuggestions, setProductSuggestions] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const { t } = useTranslation()

  const loadListas = async () => {
    const res = await window.api.listasPrecio.getAll()
    setListas(res.data || [])
  }

  const loadProductos = async () => {
    const res = await window.api.productos.getAll()
    setProductos(res.data || [])
  }

  useEffect(() => { loadListas(); loadProductos() }, [])

  const openModal = (record = null) => {
    setModal({ open: true, record })
    form.setFieldsValue(record || { nombre: '', descripcion: '' })
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setLoading(true)
    const res = modal.record
      ? await window.api.listasPrecio.update({ ...values, id: modal.record.id })
      : await window.api.listasPrecio.create(values)
    setLoading(false)
    if (!res.ok) { message.error(res.error); return }
    message.success(t('listasPrecio.saveSuccess'))
    setModal({ open: false, record: null })
    loadListas()
  }

  const handleDelete = async (id) => {
    const res = await window.api.listasPrecio.delete(id)
    if (res.ok) { message.success(t('listasPrecio.deleteSuccess')); loadListas() }
    else message.error(res.error)
  }

  const openItemsModal = async (lista) => {
    const res = await window.api.listasPrecio.getItems(lista.id)
    setItemsModal({ open: true, lista, items: res.data || [] })
  }

  const reloadItems = async () => {
    if (!itemsModal.lista) return
    const res = await window.api.listasPrecio.getItems(itemsModal.lista.id)
    setItemsModal(prev => ({ ...prev, items: res.data || [] }))
  }

  const handleRemoveItem = async (productoId) => {
    await window.api.listasPrecio.removeItem(itemsModal.lista.id, productoId)
    reloadItems()
  }

  const onProductSearch = (text) => {
    if (!text || text.length < 2) { setProductSuggestions([]); return }
    const lower = text.toLowerCase()
    const inList = new Set(itemsModal.items.map(i => i.producto_id))
    const matches = productos
      .filter(p => !inList.has(p.id) && (
        p.nombre?.toLowerCase().includes(lower) || p.codigo?.toLowerCase().includes(lower)
      ))
      .slice(0, 8)
      .map(p => ({
        value: p.nombre,
        label: (
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <span>{p.nombre}</span>
            <Text type="secondary" style={{ fontSize: 11 }}>${Number(p.precio_venta).toFixed(2)}</Text>
          </Space>
        ),
        producto: p
      }))
    setProductSuggestions(matches)
  }

  const onProductSelect = (_, option) => {
    setSelectedProduct(option.producto)
    itemForm.setFieldsValue({ precio: option.producto.precio_venta })
  }

  const handleAddItem = async () => {
    if (!selectedProduct) { message.warning(t('listasPrecio.selectProduct')); return }
    const values = await itemForm.validateFields()
    const res = await window.api.listasPrecio.setItem(
      itemsModal.lista.id, selectedProduct.id, values.precio
    )
    if (!res.ok) { message.error(res.error); return }
    message.success(t('listasPrecio.itemAdded'))
    setAddItemModal(false)
    setSelectedProduct(null)
    itemForm.resetFields()
    reloadItems()
  }

  const columns = [
    {
      title: t('listasPrecio.colName'), dataIndex: 'nombre',
      render: (v, r) => <Space><TagsOutlined style={{ color: '#1677ff' }} /><Text strong>{v}</Text>
        {r.descripcion && <Text type="secondary" style={{ fontSize: 12 }}>— {r.descripcion}</Text>}
      </Space>
    },
    {
      key: 'actions', width: 180, align: 'right',
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<UnorderedListOutlined />} onClick={() => openItemsModal(r)}>
            {t('listasPrecio.manageItems')}
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />
          <Popconfirm title={t('listasPrecio.deleteConfirm')} onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const itemColumns = [
    { title: t('listasPrecio.colProduct'), dataIndex: 'producto_nombre' },
    {
      title: t('listasPrecio.colCode'), dataIndex: 'producto_codigo', width: 120,
      render: v => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : '—'
    },
    {
      title: t('listasPrecio.colBasePrice'), dataIndex: 'precio_base', width: 120, align: 'right',
      render: v => <Text type="secondary">${Number(v).toFixed(2)}</Text>
    },
    {
      title: t('listasPrecio.colListPrice'), dataIndex: 'precio', width: 130, align: 'right',
      render: (v, r) => {
        const diff = v - r.precio_base
        const color = diff < 0 ? '#52c41a' : diff > 0 ? '#1677ff' : undefined
        return <Text strong style={{ color }}>${Number(v).toFixed(2)}</Text>
      }
    },
    {
      key: 'del', width: 50, align: 'center',
      render: (_, r) => (
        <Popconfirm title={t('listasPrecio.removeItemConfirm')} onConfirm={() => handleRemoveItem(r.producto_id)}>
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('listasPrecio.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          {t('listasPrecio.newList')}
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={listas}
          rowKey="id"
          loading={loading}
          size="small"
          locale={{ emptyText: t('listasPrecio.noLists') }}
          pagination={false}
        />
      </Card>

      {/* Modal crear/editar lista */}
      <Modal
        title={modal.record ? t('listasPrecio.editList') : t('listasPrecio.newList')}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ open: false, record: null })}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombre" label={t('listasPrecio.fieldName')} rules={[{ required: true }]}>
            <Input placeholder={t('listasPrecio.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="descripcion" label={t('listasPrecio.fieldDesc')}>
            <Input placeholder={t('listasPrecio.descPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal gestionar items */}
      <Modal
        title={
          <Space>
            <TagsOutlined />
            <span>{t('listasPrecio.itemsTitle', { name: itemsModal.lista?.nombre })}</span>
          </Space>
        }
        open={itemsModal.open}
        onCancel={() => setItemsModal({ open: false, lista: null, items: [] })}
        footer={null}
        width={700}
        destroyOnClose
      >
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => { setAddItemModal(true); setSelectedProduct(null); itemForm.resetFields() }}
          >
            {t('listasPrecio.addProduct')}
          </Button>
        </div>
        <Table
          columns={itemColumns}
          dataSource={itemsModal.items}
          rowKey="producto_id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: t('listasPrecio.noItems') }}
        />
      </Modal>

      {/* Modal agregar producto a lista */}
      <Modal
        title={t('listasPrecio.addProduct')}
        open={addItemModal}
        onOk={handleAddItem}
        onCancel={() => setAddItemModal(false)}
        destroyOnClose
      >
        <Form form={itemForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label={t('listasPrecio.searchProduct')}>
            <AutoComplete
              options={productSuggestions}
              onSearch={onProductSearch}
              onSelect={onProductSelect}
              popupMatchSelectWidth={400}
            >
              <Input placeholder={t('listasPrecio.searchProductPlaceholder')} />
            </AutoComplete>
            {selectedProduct && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {t('listasPrecio.basePrice')}: ${Number(selectedProduct.precio_venta).toFixed(2)}
              </Text>
            )}
          </Form.Item>
          <Form.Item name="precio" label={t('listasPrecio.fieldListPrice')} rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ListasPrecios
