import React, { useEffect, useState } from 'react'
import { Modal, Button, Space, Select, message, Spin } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { generateReceiptHTML } from '../utils/receipt'

export default function TicketPreview({ open, onClose, venta, items }) {
  const [config, setConfig] = useState({})
  const [pageSize, setPageSize] = useState('80mm')
  const [printing, setPrinting] = useState(false)
  const [html, setHtml] = useState('')

  useEffect(() => {
    if (open) loadConfig()
  }, [open])

  useEffect(() => {
    if (venta && items) {
      setHtml(generateReceiptHTML(venta, items, config, pageSize))
    }
  }, [venta, items, config, pageSize])

  async function loadConfig() {
    const res = await window.api.config.getAll()
    if (res.ok) setConfig(res.data || {})
  }

  async function handlePrint() {
    if (!html) return
    setPrinting(true)
    const res = await window.api.print.ticket(html, {
      silent: false,
      pageSize: pageSize === '80mm' ? { width: 80000, height: 200000 } : pageSize
    })
    setPrinting(false)
    if (res.ok) {
      message.success('Enviado a la impresora')
      onClose()
    } else if (res.reason !== 'window-closed') {
      message.info('Impresión cancelada')
    }
  }

  const isWide = pageSize === 'A4' || pageSize === 'A5'
  const modalTitle = pageSize === '80mm'
    ? 'Vista Previa — Ticket Térmico'
    : `Vista Previa — Comprobante ${pageSize}`

  return (
    <Modal
      title={<Space><PrinterOutlined />{modalTitle}</Space>}
      open={open}
      onCancel={onClose}
      width={isWide ? 760 : 480}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span style={{ fontSize: 13 }}>Formato:</span>
            <Select
              value={pageSize}
              onChange={setPageSize}
              size="small"
              style={{ width: 150 }}
              options={[
                { value: '80mm', label: 'Ticket Térmico 80mm' },
                { value: 'A4',   label: 'Comprobante A4' },
                { value: 'A5',   label: 'Comprobante A5' }
              ]}
            />
          </Space>
          <Space>
            <Button onClick={onClose}>Cerrar</Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              loading={printing}
              onClick={handlePrint}
            >
              Imprimir / PDF
            </Button>
          </Space>
        </Space>
      }
      destroyOnClose
    >
      {html ? (
        <div style={{
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#e8e8e8',
          padding: isWide ? 16 : 8,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <iframe
            srcDoc={html}
            style={{
              width: pageSize === '80mm' ? 302 : '100%',
              height: isWide ? 560 : 500,
              border: 'none',
              background: '#fff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)'
            }}
            title="Vista previa"
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      )}
    </Modal>
  )
}
