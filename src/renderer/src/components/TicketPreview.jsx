import React, { useEffect, useState } from 'react'
import { Modal, Button, Space, Select, message, Spin } from 'antd'
import { PrinterOutlined, EyeOutlined } from '@ant-design/icons'
import { generateReceiptHTML } from '../utils/receipt'

/**
 * Modal de vista previa e impresión de ticket.
 * Props:
 *   open        - boolean
 *   onClose     - callback
 *   venta       - objeto venta
 *   items       - array de items de la venta
 */
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
      setHtml(generateReceiptHTML(venta, items, config))
    }
  }, [venta, items, config])

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

  return (
    <Modal
      title={<Space><PrinterOutlined />Vista Previa del Ticket</Space>}
      open={open}
      onCancel={onClose}
      width={480}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span style={{ fontSize: 13 }}>Tamaño:</span>
            <Select
              value={pageSize}
              onChange={setPageSize}
              size="small"
              style={{ width: 120 }}
              options={[
                { value: '80mm', label: 'Térmica 80mm' },
                { value: 'A4', label: 'A4' },
                { value: 'A5', label: 'A5' }
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
              Imprimir
            </Button>
          </Space>
        </Space>
      }
      destroyOnClose
    >
      {/* Vista previa inline usando iframe */}
      {html ? (
        <div style={{
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          overflow: 'hidden',
          background: '#f5f5f5',
          padding: 8,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <iframe
            srcDoc={html}
            style={{
              width: pageSize === '80mm' ? 302 : '100%',
              height: 500,
              border: 'none',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
            title="Vista previa ticket"
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      )}
    </Modal>
  )
}
