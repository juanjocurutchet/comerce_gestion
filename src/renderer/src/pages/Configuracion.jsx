import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Typography, message, Divider } from 'antd'
import { ShopOutlined, SaveOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function Configuracion() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    const res = await window.api.config.getAll()
    if (res.ok && res.data) form.setFieldsValue(res.data)
  }

  async function handleSave() {
    const values = await form.validateFields()
    setLoading(true)
    const res = await window.api.config.setMany(values)
    setLoading(false)
    if (res.ok) message.success('Configuración guardada')
    else message.error(res.error || 'Error al guardar')
  }

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
      </div>

      <Card title={<><ShopOutlined style={{ marginRight: 8 }} />Datos del Comercio</>} style={{ maxWidth: 600 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Estos datos aparecen en los tickets de venta.
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item name="nombreComercio" label="Nombre del comercio" rules={[{ required: true }]}>
            <Input placeholder="Ej: Almacén Don Pedro" />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input placeholder="Ej: Av. Corrientes 1234, Buenos Aires" />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input placeholder="Ej: (011) 4123-4567" />
          </Form.Item>
          <Form.Item name="cuit" label="CUIT">
            <Input placeholder="Ej: 20-12345678-9" />
          </Form.Item>

          <Divider />

          <Form.Item name="ticketFooter" label="Mensaje de pie de ticket">
            <Input placeholder="Ej: Gracias por su compra!" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
              Guardar Configuración
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
