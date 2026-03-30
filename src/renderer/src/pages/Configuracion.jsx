import React, { useEffect, useState } from 'react'
import {
  Card, Form, Input, Button, Typography, message,
  Divider, Alert, Space, Popconfirm, Tag, List
} from 'antd'
import {
  ShopOutlined, SaveOutlined, ExperimentOutlined, DeleteOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function Configuracion() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [seedLoading, setSeedLoading] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)
  const [seedResult, setSeedResult] = useState(null)
  const user = useAuthStore(s => s.user)

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

  async function handleSeed() {
    setSeedLoading(true)
    setSeedResult(null)
    try {
      const res = await window.api.seed.run(user?.id)
      if (res.ok) {
        setSeedResult(res.data)
        message.success(`¡Datos de prueba cargados! ${res.data.creados} productos creados.`)
      } else {
        message.error(res.error || 'Error al cargar datos')
      }
    } catch (e) {
      message.error('Error inesperado: ' + e.message)
    } finally {
      setSeedLoading(false)
    }
  }

  async function handleClear() {
    setClearLoading(true)
    try {
      const res = await window.api.seed.clear()
      if (res.ok) {
        setSeedResult(null)
        message.success(`Datos de prueba eliminados (${res.data.eliminados} productos)`)
      } else {
        message.error(res.error || 'Error al eliminar')
      }
    } catch (e) {
      message.error('Error inesperado: ' + e.message)
    } finally {
      setClearLoading(false)
    }
  }

  const categoriasSeed = [
    'Plantas de Interior', 'Plantas de Exterior', 'Plantas Artificiales',
    'Macetas y Contenedores', 'Ramos y Flores Cortadas',
    'Tierra y Sustratos', 'Pesticidas y Fertilizantes', 'Decoración'
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Configuración</Title>
      </div>

      <Card
        title={<><ShopOutlined style={{ marginRight: 8 }} />Datos del Comercio</>}
        style={{ maxWidth: 600, marginBottom: 16 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Estos datos aparecen en los tickets de venta.
        </Text>
        <Form form={form} layout="vertical">
          <Form.Item name="nombreComercio" label="Nombre del comercio" rules={[{ required: true }]}>
            <Input placeholder="Ej: Vivero El Jardín" />
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

      <Card
        title={<><ExperimentOutlined style={{ marginRight: 8 }} />Datos de Prueba — Vivero</>}
        style={{ maxWidth: 600 }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Solo para testing"
          description="Carga 50 productos de ejemplo para un vivero, con 8 categorías, 5 proveedores y stock inicial. Si ya existen productos con el mismo código, se omiten sin modificar."
        />

        <Text strong style={{ display: 'block', marginBottom: 8 }}>Categorías que se crean:</Text>
        <Space wrap style={{ marginBottom: 16 }}>
          {categoriasSeed.map(c => <Tag key={c} color="green">{c}</Tag>)}
        </Space>

        <Text strong style={{ display: 'block', marginBottom: 8 }}>Proveedores que se crean:</Text>
        <Space wrap style={{ marginBottom: 16 }}>
          {['Vivero del Norte S.A.', 'Plásticos Jardín S.R.L.', 'AgroQuím S.A.', 'Floral Import', 'Deco Verde']
            .map(p => <Tag key={p}>{p}</Tag>)}
        </Space>

        {seedResult && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 16 }}
            message={
              <Space>
                <span><b>{seedResult.creados}</b> productos creados</span>
                {seedResult.omitidos > 0 && <span>· <b>{seedResult.omitidos}</b> ya existían (omitidos)</span>}
                <span>· <b>{seedResult.categorias}</b> categorías</span>
                <span>· <b>{seedResult.proveedores}</b> proveedores</span>
              </Space>
            }
          />
        )}

        <Space>
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            loading={seedLoading}
            onClick={handleSeed}
          >
            Cargar Datos de Prueba
          </Button>

          <Popconfirm
            title="¿Eliminar datos de prueba?"
            description="Se eliminarán los 50 productos del seed y sus movimientos de stock. Las categorías y proveedores también se quitarán si no tienen otros productos."
            onConfirm={handleClear}
            okText="Eliminar" cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={clearLoading}>
              Eliminar Datos de Prueba
            </Button>
          </Popconfirm>
        </Space>
      </Card>
    </div>
  )
}
