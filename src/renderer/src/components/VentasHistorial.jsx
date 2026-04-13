import React, { useEffect, useState } from 'react'
import {
  Row, Col, Table, Button, Typography, Space, Tag, Divider, Modal, message, Popconfirm
} from 'antd'
import { EyeOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import TicketPreview from './TicketPreview'
import useExport from '../hooks/useExport'
import dayjs from 'dayjs'

const { Text } = Typography

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [items, setItems] = useState([])
  const [ticketModal, setTicketModal] = useState({ open: false, venta: null, items: [] })
  const user = useAuthStore(s => s.user)
  const { t } = useTranslation()
  const { exportToExcel, exporting } = useExport()

  const loadVentas = async () => {
    setLoading(true)
    const res = await window.api.ventas.getAll()
    setVentas(res.data || [])
    setLoading(false)
  }

  useEffect(() => { loadVentas() }, [])

  const verDetalle = async (venta) => {
    const res = await window.api.ventas.getItems(venta.id)
    setItems(res.data || [])
    setDetalle(venta)
  }

  const imprimirTicket = async (venta) => {
    const res = await window.api.ventas.getItems(venta.id)
    setTicketModal({ open: true, venta, items: res.data || [] })
  }

  const anularVenta = async (id) => {
    const res = await window.api.ventas.anular(id, user?.id)
    if (res.ok) { message.success(t('ventas.voidSuccess')); loadVentas() }
    else message.error(res.error)
  }

  const columns = [
    { title: t('ventas.historyColId'), dataIndex: 'id', width: 60 },
    { title: t('ventas.historyColDate'), dataIndex: 'fecha', render: v => dayjs(v).format('DD/MM/YY HH:mm'), width: 130 },
    { title: t('ventas.historyColTotal'), dataIndex: 'total', render: v => `$${Number(v).toFixed(2)}`, align: 'right' },
    { title: t('ventas.historyColPayment'), dataIndex: 'metodo_pago', render: v => <Tag>{t(`ventas.methods.${v}`, v)}</Tag> },
    {
      title: t('ventas.historyColStatus'), dataIndex: 'estado',
      render: v => <Tag color={v === 'completada' ? 'success' : 'error'}>{v}</Tag>
    },
    { title: t('ventas.historyColSeller'), dataIndex: 'usuario_nombre', render: v => v || '-' },
    {
      key: 'acc', width: 130,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => verDetalle(r)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => imprimirTicket(r)} />
          {r.estado === 'completada' && (
            <Popconfirm title={t('ventas.voidConfirm')} onConfirm={() => anularVenta(r.id)} okText={t('common.yes')} cancelText={t('common.no')}>
              <Button size="small" danger>{t('ventas.voidSale')}</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  const exportCols = [
    { title: 'ID', dataIndex: 'id' },
    { title: t('ventas.historyColDate'), dataIndex: 'fecha', exportRender: v => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: t('ventas.historyColTotal'), dataIndex: 'total', exportRender: v => Number(v).toFixed(2) },
    { title: t('ventas.historyColPayment'), dataIndex: 'metodo_pago' },
    { title: t('ventas.historyColStatus'), dataIndex: 'estado' },
    { title: t('ventas.historyColSeller'), dataIndex: 'usuario_nombre' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px 0' }}>
        <Button
          icon={<FileExcelOutlined />}
          onClick={() => exportToExcel(exportCols, ventas, 'ventas')}
          loading={exporting}
        >
          {t('common.exportExcel')}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={ventas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15, showTotal: total => t('ventas.pagTotal', { total }) }}
        style={{ padding: '0 16px' }}
      />
      <Modal
        title={t('ventas.detailTitle', { id: detalle?.id })}
        open={!!detalle}
        onCancel={() => setDetalle(null)}
        footer={<Button onClick={() => setDetalle(null)}>{t('common.close')}</Button>}
        width={500}
      >
        {detalle && (
          <>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Text type="secondary">{t('ventas.detailDate')}</Text><br />
                <Text>{dayjs(detalle.fecha).format('DD/MM/YYYY HH:mm')}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">{t('ventas.detailPayment')}</Text><br />
                <Tag>{t(`ventas.methods.${detalle.metodo_pago}`, detalle.metodo_pago)}</Tag>
              </Col>
            </Row>
            <Table
              columns={[
                { title: t('ventas.colProductName'), dataIndex: 'producto_nombre' },
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

      <TicketPreview
        open={ticketModal.open}
        venta={ticketModal.venta}
        items={ticketModal.items}
        onClose={() => setTicketModal({ open: false, venta: null, items: [] })}
      />
    </>
  )
}

export default HistorialVentas
