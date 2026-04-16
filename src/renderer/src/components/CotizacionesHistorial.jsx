import React, { useEffect, useState } from 'react'
import {
  Row, Col, Table, Button, Typography, Space, Tag, Divider, Modal, message, Popconfirm, Select
} from 'antd'
import { EyeOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { generateQuoteHTML } from '../utils/receipt'
import dayjs from 'dayjs'

const { Text } = Typography

const ESTADO_COLOR = { pendiente: 'gold', aceptada: 'green', rechazada: 'red', vencida: 'default' }

const HistorialCotizaciones = () => {
  const [cotizaciones, setCotizaciones] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 })
  const [loading, setLoading] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [items, setItems] = useState([])
  const [loadingPdf, setLoadingPdf] = useState(false)
  const { t } = useTranslation()

  const loadCotizaciones = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    const res = await window.api.cotizaciones.getAll({
      paginate: true,
      page,
      pageSize
    })
    const data = res.data || {}
    setCotizaciones(data.items || [])
    setPagination((prev) => ({
      ...prev,
      current: data.page || page,
      pageSize: data.pageSize || pageSize,
      total: data.total || 0
    }))
    setLoading(false)
  }

  useEffect(() => { loadCotizaciones() }, [])

  const verDetalle = async (cot) => {
    const res = await window.api.cotizaciones.getItems(cot.id)
    setItems(res.data || [])
    setDetalle(cot)
  }

  const imprimirPDF = async (cot) => {
    setLoadingPdf(true)
    const [itemsRes, configRes] = await Promise.all([
      window.api.cotizaciones.getItems(cot.id),
      window.api.config.getAll()
    ])
    const html = generateQuoteHTML(cot, itemsRes.data || [], configRes.data || {})
    await window.api.print.ticket(html, { silent: false, pageSize: 'A4' })
    setLoadingPdf(false)
  }

  const cambiarEstado = async (id, estado) => {
    const res = await window.api.cotizaciones.updateEstado(id, estado)
    if (res.ok) { message.success(t('cotizaciones.stateUpdated')); loadCotizaciones() }
    else message.error(res.error)
  }

  const eliminar = async (id) => {
    const res = await window.api.cotizaciones.delete(id)
    if (res.ok) { message.success(t('cotizaciones.deleteSuccess')); loadCotizaciones() }
    else message.error(res.error)
  }

  const handleTableChange = (nextPagination) => {
    loadCotizaciones(nextPagination.current, nextPagination.pageSize)
  }

  const columns = [
    { title: t('cotizaciones.historyColId'), dataIndex: 'id', width: 60 },
    { title: t('cotizaciones.historyColDate'), dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YY HH:mm'), width: 130 },
    { title: t('cotizaciones.historyColTotal'), dataIndex: 'total', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: t('cotizaciones.historyColValidity'), dataIndex: 'validez_dias', render: v => t('cotizaciones.validityValue', { days: v }), width: 80 },
    {
      title: t('cotizaciones.historyColStatus'), dataIndex: 'estado', width: 110,
      render: (v, r) => (
        <Select value={v} size="small" style={{ width: 110 }}
          onChange={val => cambiarEstado(r.id, val)}
          options={[
            { value: 'pendiente', label: <Tag color="gold">{t('cotizaciones.estados.pendiente')}</Tag> },
            { value: 'aceptada',  label: <Tag color="green">{t('cotizaciones.estados.aceptada')}</Tag> },
            { value: 'rechazada', label: <Tag color="red">{t('cotizaciones.estados.rechazada')}</Tag> },
            { value: 'vencida',   label: <Tag color="default">{t('cotizaciones.estados.vencida')}</Tag> }
          ]}
        />
      )
    },
    { title: t('cotizaciones.historyColSeller'), dataIndex: 'usuario_nombre', render: v => v || '-' },
    {
      key: 'acc', width: 110,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)} />
          <Button size="small" icon={<PrinterOutlined />} loading={loadingPdf} onClick={() => imprimirPDF(r)} />
          <Popconfirm title={t('cotizaciones.deleteCotizacion')} onConfirm={() => eliminar(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Table
        columns={columns}
        dataSource={cotizaciones}
        rowKey="id"
        loading={loading}
        size="small"
        onChange={handleTableChange}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: total => t('cotizaciones.pagTotal', { total })
        }}
        style={{ padding: '8px 16px' }}
      />

      <Modal
        title={t('cotizaciones.detailTitle', { id: detalle?.id })}
        open={!!detalle}
        onCancel={() => setDetalle(null)}
        width={560}
        footer={
          <Space>
            <Button icon={<PrinterOutlined />} type="primary" onClick={() => imprimirPDF(detalle)}>
              {t('cotizaciones.printPDF')}
            </Button>
            <Button onClick={() => setDetalle(null)}>{t('common.close')}</Button>
          </Space>
        }
      >
        {detalle && (
          <>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Text type="secondary">{t('cotizaciones.detailDate')}</Text><br />
                <Text>{dayjs(detalle.fecha).format('DD/MM/YYYY HH:mm')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">{t('cotizaciones.detailStatus')}</Text><br />
                <Tag color={ESTADO_COLOR[detalle.estado]}>{t(`cotizaciones.estados.${detalle.estado}`, detalle.estado)}</Tag>
              </Col>
              <Col span={12} style={{ marginTop: 8 }}>
                <Text type="secondary">{t('cotizaciones.detailValidity')}</Text><br />
                <Text>{t('cotizaciones.validityValue', { days: detalle.validez_dias })}</Text>
              </Col>
              <Col span={12} style={{ marginTop: 8 }}>
                <Text type="secondary">{t('cotizaciones.detailExpires')}</Text><br />
                <Text>{dayjs(detalle.fecha).add(detalle.validez_dias, 'day').format('DD/MM/YYYY')}</Text>
              </Col>
            </Row>
            {detalle.notas && <p style={{ marginBottom: 12 }}><Text type="secondary">{t('cotizaciones.detailNotes')}</Text> {detalle.notas}</p>}
            <Table
              columns={[
                { title: t('ventas.colProductName'), dataIndex: 'nombre' },
                { title: t('ventas.colQty'), dataIndex: 'cantidad', align: 'center' },
                { title: t('ventas.colPrice'), dataIndex: 'precio_unitario', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
                { title: t('ventas.colSubtotal'), dataIndex: 'subtotal', render: v => `$${Number(v).toFixed(2)}`, align: 'right' }
              ]}
              dataSource={items}
              rowKey="id"
              size="small"
              pagination={false}
            />
            <Divider />
            <Row justify="space-between"><Text>{t('common.subtotal')}:</Text><Text>${Number(detalle.subtotal).toFixed(2)}</Text></Row>
            {detalle.descuento > 0 && <Row justify="space-between"><Text>{t('common.discount')}:</Text><Text>-${Number(detalle.descuento).toFixed(2)}</Text></Row>}
            <Row justify="space-between"><Text strong>{t('common.total')}:</Text><Text strong>${Number(detalle.total).toFixed(2)}</Text></Row>
          </>
        )}
      </Modal>
    </>
  )
}

export default HistorialCotizaciones
