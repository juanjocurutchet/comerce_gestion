import React, { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, DatePicker, Button, Table,
  Statistic, Tabs, Space, Spin
} from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

const Reportes = () => {
  const [rango, setRango] = useState([dayjs().subtract(29, 'day'), dayjs()])
  const [loading, setLoading] = useState(false)
  const [ventasDia, setVentasDia] = useState([])
  const [topProductos, setTopProductos] = useState([])
  const [porCategoria, setPorCategoria] = useState([])
  const { t } = useTranslation()

  useEffect(() => { loadReportes() }, [])

  const loadReportes = async () => {
    if (!rango[0] || !rango[1]) return
    setLoading(true)
    const desde = rango[0].format('YYYY-MM-DD')
    const hasta = rango[1].format('YYYY-MM-DD')
    const [d, p, c] = await Promise.all([
      window.api.reportes.ventasPorDia(desde, hasta),
      window.api.reportes.ventasPorProducto(desde, hasta),
      window.api.reportes.ventasPorCategoria(desde, hasta)
    ])
    setVentasDia((d.data || []).map(r => ({ ...r, total: Number(r.total) })))
    setTopProductos(p.data || [])
    setPorCategoria((c.data || []).map(r => ({ ...r, total: Number(r.total), name: r.categoria || t('reportes.noCategory') })))
    setLoading(false)
  }

  const totalPeriodo = ventasDia.reduce((a, d) => a + d.total, 0)
  const cantidadPeriodo = ventasDia.reduce((a, d) => a + d.cantidad, 0)
  const promedioDiario = ventasDia.length > 0 ? totalPeriodo / ventasDia.length : 0

  const colsProductos = [
    { title: '#', render: (_, __, i) => i + 1, width: 40 },
    { title: t('reportes.colProduct'), dataIndex: 'nombre' },
    { title: t('reportes.colCode'), dataIndex: 'codigo', render: v => v || '-' },
    { title: t('reportes.colUnitsSold'), dataIndex: 'cantidad_vendida', align: 'right', sorter: (a, b) => a.cantidad_vendida - b.cantidad_vendida },
    { title: t('reportes.colTotalSold'), dataIndex: 'total_vendido', render: v => `$${Number(v).toFixed(2)}`, align: 'right', sorter: (a, b) => a.total_vendido - b.total_vendido, defaultSortOrder: 'descend' }
  ]

  const tabItems = [
    {
      key: 'ventas',
      label: t('reportes.tabSalesByDay'),
      children: (
        <Card>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={ventasDia}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1677ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString('es', { minimumFractionDigits: 2 })}`, t('common.total')]} />
              <Area type="monotone" dataKey="total" stroke="#1677ff" fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )
    },
    {
      key: 'productos',
      label: t('reportes.tabTopProducts'),
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Card>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProductos.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, t('common.total')]} />
                  <Bar dataKey="total_vendido" fill="#1677ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Table
                columns={colsProductos}
                dataSource={topProductos}
                rowKey={(r, i) => r.codigo || i}
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'categorias',
      label: t('reportes.tabByCategory'),
      children: (
        <Row gutter={16} justify="center">
          <Col span={12}>
            <Card>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={porCategoria}
                    dataKey="total"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={110}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, t('common.total')]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Table
                columns={[
                  { title: t('reportes.colCategory'), dataIndex: 'categoria', render: v => v || t('reportes.noCategory') },
                  { title: t('reportes.colTotalSold'), dataIndex: 'total', render: v => `$${Number(v).toFixed(2)}`, align: 'right', sorter: (a, b) => a.total - b.total, defaultSortOrder: 'descend' }
                ]}
                dataSource={porCategoria}
                rowKey={(r, i) => r.categoria || i}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>{t('reportes.title')}</Title>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Text>{t('reportes.periodLabel')}</Text>
          <RangePicker
            value={rango}
            onChange={v => setRango(v || [null, null])}
            format="DD/MM/YYYY"
            presets={[
              { label: t('reportes.presetToday'), value: [dayjs(), dayjs()] },
              { label: t('reportes.presetLast7'), value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: t('reportes.presetLast30'), value: [dayjs().subtract(29, 'day'), dayjs()] },
              { label: t('reportes.presetThisMonth'), value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: t('reportes.presetLastMonth'), value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] }
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={loadReportes} loading={loading}>
            {t('reportes.queryBtn')}
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card className="stat-card">
            <Statistic title={t('reportes.statTotal')} value={totalPeriodo} prefix="$" precision={2} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card">
            <Statistic title={t('reportes.statCount')} value={cantidadPeriodo} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card">
            <Statistic title={t('reportes.statAverage')} value={promedioDiario} prefix="$" precision={2} />
          </Card>
        </Col>
      </Row>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <Tabs items={tabItems} />
      )}
    </div>
  )
}

export default Reportes
