import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, List, Tag, Spin } from 'antd'
import {
  ShoppingCartOutlined, DollarOutlined, AppstoreOutlined,
  WarningOutlined, ArrowUpOutlined
} from '@ant-design/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'

const { Title, Text } = Typography

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState(null)
  const [ventasHoy, setVentasHoy] = useState(null)
  const [stockBajo, setStockBajo] = useState([])
  const [graficaSemana, setGraficaSemana] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [r, h, sb, g] = await Promise.all([
      window.api.reportes.resumenGeneral(),
      window.api.ventas.resumenHoy(),
      window.api.productos.getStockBajo(),
      window.api.ventas.resumenPeriodo(
        dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      )
    ])
    setResumen(r.data)
    setVentasHoy(h.data)
    setStockBajo(sb.data || [])
    const dias = []
    for (let i = 6; i >= 0; i--) {
      const dia = dayjs().subtract(i, 'day')
      const found = (g.data || []).find(d => d.dia === dia.format('YYYY-MM-DD'))
      dias.push({ dia: dia.format('ddd DD'), total: found ? found.total : 0, cantidad: found ? found.cantidad : 0 })
    }
    setGraficaSemana(dias)
    setLoading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</Text>
      </div>

      {/* Estadísticas del día */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #1677ff, #0050b3)', border: 'none' }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Ventas Hoy</Text>}
              value={ventasHoy?.cantidad || 0}
              suffix="ventas"
              valueStyle={{ color: '#fff', fontSize: 28 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #52c41a, #237804)', border: 'none' }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Recaudado Hoy</Text>}
              value={ventasHoy?.total || 0}
              prefix={<Text style={{ color: '#fff' }}>$</Text>}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #722ed1, #391085)', border: 'none' }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Productos Activos</Text>}
              value={resumen?.total_productos || 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #fa8c16, #ad4e00)', border: 'none' }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>Stock Bajo</Text>}
              value={resumen?.stock_bajo || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              suffix="productos"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Ventas últimos 7 días" className="stat-card">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={graficaSemana}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1677ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                <Tooltip formatter={(v) => [`$${v.toLocaleString('es', { minimumFractionDigits: 2 })}`, 'Total']} />
                <Area type="monotone" dataKey="total" stroke="#1677ff" fill="url(#colorVentas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={<span><WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />Stock Bajo</span>}
            className="stat-card"
            styles={{ body: { padding: '0 16px' } }}
          >
            {stockBajo.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Text type="secondary">Sin alertas de stock</Text>
              </div>
            ) : (
              <List
                dataSource={stockBajo.slice(0, 8)}
                renderItem={(item) => (
                  <List.Item style={{ padding: '10px 0' }}>
                    <List.Item.Meta
                      title={<Text style={{ fontSize: 13 }}>{item.nombre}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{item.codigo || 'Sin código'}</Text>}
                    />
                    <Tag color={item.stock_actual <= 0 ? 'error' : 'warning'}>
                      {item.stock_actual} {item.unidad}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card className="stat-card">
            <Row gutter={[32, 16]} justify="space-around" style={{ textAlign: 'center' }}>
              <Col>
                <Statistic title="Total Ventas Históricas" value={resumen?.total_ventas || 0} />
              </Col>
              <Col>
                <Statistic title="Monto Total Histórico" value={resumen?.monto_total || 0} prefix="$" precision={2} />
              </Col>
              <Col>
                <Statistic title="Proveedores" value={resumen?.total_proveedores || 0} />
              </Col>
              <Col>
                <Statistic title="Productos con Stock Bajo" value={resumen?.stock_bajo || 0} valueStyle={{ color: resumen?.stock_bajo > 0 ? '#fa8c16' : undefined }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
