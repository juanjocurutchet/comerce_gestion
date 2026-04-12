import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, List, Tag, Spin, Modal } from 'antd'
import {
  ShoppingCartOutlined, AppstoreOutlined,
  WarningOutlined, CalendarOutlined
} from '@ant-design/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState(null)
  const [ventasHoy, setVentasHoy] = useState(null)
  const [stockBajo, setStockBajo] = useState([])
  const [vencimientos, setVencimientos] = useState([])
  const [graficaSemana, setGraficaSemana] = useState([])
  const [modalStock, setModalStock] = useState(false)
  const [modalVenc, setModalVenc] = useState(false)
  const { t } = useTranslation()

  const loadData = async () => {
    setLoading(true)
    const [r, h, sb, vc, g] = await Promise.all([
      window.api.reportes.resumenGeneral(),
      window.api.ventas.resumenHoy(),
      window.api.productos.getStockBajo(),
      window.api.productos.getVencimientosCercanos(),
      window.api.ventas.resumenPeriodo(
        dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      )
    ])
    setResumen(r.data)
    setVentasHoy(h.data)
    setStockBajo(sb.data || [])
    setVencimientos(vc.data || [])
    const dias = []
    for (let i = 6; i >= 0; i--) {
      const dia = dayjs().subtract(i, 'day')
      const found = (g.data || []).find(d => d.dia === dia.format('YYYY-MM-DD'))
      dias.push({ dia: dia.format('ddd DD'), total: found ? found.total : 0, cantidad: found ? found.cantidad : 0 })
    }
    setGraficaSemana(dias)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>{t('dashboard.title')}</Title>
        <Text type="secondary">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #1677ff, #0050b3)', border: 'none' }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>{t('dashboard.salesToday')}</Text>}
              value={ventasHoy?.cantidad || 0}
              suffix={t('dashboard.salesTodaySuffix')}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ background: 'linear-gradient(135deg, #52c41a, #237804)', border: 'none' }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>{t('dashboard.revenueToday')}</Text>}
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
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>{t('dashboard.activeProducts')}</Text>}
              value={resumen?.total_productos || 0}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #fa8c16, #ad4e00)', border: 'none', cursor: stockBajo.length > 0 ? 'pointer' : 'default' }}
            onClick={() => stockBajo.length > 0 && setModalStock(true)}
          >
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>{t('dashboard.lowStock')}</Text>}
              value={resumen?.stock_bajo || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fff', fontSize: 28 }}
              suffix={t('dashboard.lowStockSuffix')}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.last7Days')} className="stat-card">
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
                <Tooltip formatter={(v) => [`$${v.toLocaleString('es', { minimumFractionDigits: 2 })}`, t('common.total')]} />
                <Area type="monotone" dataKey="total" stroke="#1677ff" fill="url(#colorVentas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card
            title={<span><WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />{t('dashboard.lowStockTitle')}</span>}
            className="stat-card"
            styles={{ body: { padding: '0 16px' } }}
            extra={stockBajo.length > 0 && (
              <Text
                style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
                onClick={() => setModalStock(true)}
              >
                {t('common.showAll')} ({stockBajo.length})
              </Text>
            )}
          >
            {stockBajo.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Text type="secondary">{t('dashboard.noLowStock')}</Text>
              </div>
            ) : (
              <List
                dataSource={stockBajo.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item style={{ padding: '8px 0' }}>
                    <List.Item.Meta title={<Text style={{ fontSize: 13 }}>{item.nombre}</Text>} />
                    <Tag color={item.stock_actual <= 0 ? 'error' : 'warning'}>
                      {item.stock_actual} {item.unidad}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card
            title={<span><CalendarOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />{t('dashboard.expiringTitle')}</span>}
            className="stat-card"
            styles={{ body: { padding: '0 16px' } }}
            extra={vencimientos.length > 0 && (
              <Text
                style={{ fontSize: 12, color: '#1677ff', cursor: 'pointer' }}
                onClick={() => setModalVenc(true)}
              >
                {t('common.showAll')} ({vencimientos.length})
              </Text>
            )}
          >
            {vencimientos.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Text type="secondary">{t('dashboard.noExpiring')}</Text>
              </div>
            ) : (
              <List
                dataSource={vencimientos.slice(0, 5)}
                renderItem={(item) => {
                  const dias = dayjs(item.fecha_vencimiento).diff(dayjs(), 'day')
                  return (
                    <List.Item style={{ padding: '8px 0' }}>
                      <List.Item.Meta title={<Text style={{ fontSize: 13 }}>{item.nombre}</Text>} />
                      <Tag color={dias < 0 ? 'error' : dias <= 7 ? 'error' : 'warning'}>
                        {dias < 0 ? t('dashboard.expired') : t('dashboard.expiresIn', { days: dias })}
                      </Tag>
                    </List.Item>
                  )
                }}
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
                <Statistic title={t('dashboard.totalHistoricSales')} value={resumen?.total_ventas || 0} />
              </Col>
              <Col>
                <Statistic title={t('dashboard.totalHistoricAmount')} value={resumen?.monto_total || 0} prefix="$" precision={2} />
              </Col>
              <Col>
                <Statistic title={t('dashboard.suppliers')} value={resumen?.total_proveedores || 0} />
              </Col>
              <Col>
                <Statistic
                  title={t('dashboard.productsLowStock')}
                  value={resumen?.stock_bajo || 0}
                  valueStyle={{ color: resumen?.stock_bajo > 0 ? '#fa8c16' : undefined }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title={<span><WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />{t('dashboard.modalLowStockTitle')}</span>}
        open={modalStock}
        onCancel={() => setModalStock(false)}
        footer={null}
        width={500}
      >
        <List
          dataSource={stockBajo}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.nombre}
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.codigo ? `Cód: ${item.codigo}` : t('dashboard.noCode')}
                    {item.categoria_nombre ? ` · ${item.categoria_nombre}` : ''}
                  </Text>
                }
              />
              <div style={{ textAlign: 'right' }}>
                <Tag color={item.stock_actual <= 0 ? 'error' : 'warning'}>
                  {t('dashboard.stockLabel', { stock: item.stock_actual, unit: item.unidad })}
                </Tag>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {t('dashboard.minimum', { min: item.stock_minimo })}
                </div>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: t('dashboard.noLowStockEmpty') }}
        />
      </Modal>

      <Modal
        title={<span><CalendarOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />{t('dashboard.modalExpiringTitle')}</span>}
        open={modalVenc}
        onCancel={() => setModalVenc(false)}
        footer={null}
        width={500}
      >
        <List
          dataSource={vencimientos}
          renderItem={(item) => {
            const dias = dayjs(item.fecha_vencimiento).diff(dayjs(), 'day')
            return (
              <List.Item>
                <List.Item.Meta
                  title={item.nombre}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.codigo ? `Cód: ${item.codigo}` : t('dashboard.noCode')}
                      {item.categoria_nombre ? ` · ${item.categoria_nombre}` : ''}
                    </Text>
                  }
                />
                <div style={{ textAlign: 'right' }}>
                  <Tag color={dias < 0 ? 'error' : dias <= 7 ? 'error' : 'warning'}>
                    {dias < 0 ? t('dashboard.expired') : t('dashboard.expiresInFull', { days: dias })}
                  </Tag>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {dayjs(item.fecha_vencimiento).format('DD/MM/YYYY')}
                  </div>
                </div>
              </List.Item>
            )
          }}
          locale={{ emptyText: t('dashboard.noExpiringEmpty') }}
        />
      </Modal>
    </div>
  )
}

export default Dashboard
