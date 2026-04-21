import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Typography, Card, Space, Button, Alert, Table, Switch, message, Tag
} from 'antd'
import { SafetyCertificateOutlined, CloudOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

const { Title, Text } = Typography

function snapshotDisplayName(row) {
  const s = row?.commerce_snapshot
  if (!s) return '—'
  if (s.nombre) return s.nombre
  if (s.license?.cliente_nombre) return s.license.cliente_nombre
  if (s.license?.clave) return s.license.clave
  return '—'
}

function snapshotLicenseKey(row) {
  const k = row?.commerce_snapshot?.license?.clave
  return k || '—'
}

function columnsBase(t) {
  return [
    {
      title: t('comercios.colId'),
      dataIndex: 'id',
      key: 'id',
      width: 200,
      ellipsis: true
    },
    {
      title: t('comercios.colCreated'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—')
    },
    {
      title: t('comercios.colName'),
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true
    },
    {
      title: t('comercios.colAddress'),
      dataIndex: 'direccion',
      key: 'direccion',
      ellipsis: true,
      render: (v) => v || '—'
    },
    {
      title: t('comercios.colPhone'),
      dataIndex: 'telefono',
      key: 'telefono',
      width: 130,
      render: (v) => v || '—'
    },
    {
      title: t('comercios.colEmail'),
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      render: (v) => v || '—'
    },
    {
      title: t('comercios.colPlan'),
      dataIndex: 'plan',
      key: 'plan',
      width: 100,
      render: (v) => v || '—'
    },
    {
      title: t('comercios.colActive'),
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (v) => (v === false ? t('comercios.no') : t('comercios.yes'))
    }
  ]
}

const Comercios = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [licenses, setLicenses] = useState([])
  const [demos, setDemos] = useState([])
  const [historyRows, setHistoryRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)
  const [onlyActive, setOnlyActive] = useState(true)

  /** Comercios que siguen referenciados por alguna licencia o fila de altas demo (evita fantasmas tras borrar todo). */
  const commerceIdsLinked = useMemo(() => {
    const s = new Set()
    for (const l of licenses || []) {
      const cid = String(l?.commerce_id || '').trim()
      if (cid) s.add(cid)
    }
    for (const d of demos || []) {
      const cid = String(d?.commerce_id || '').trim()
      if (cid) s.add(cid)
    }
    return s
  }, [licenses, demos])

  const inactiveCommerceIdsFromLicenses = useMemo(() => {
    const out = new Set()
    for (const l of licenses || []) {
      if (l?.activo === false && l?.commerce_id) out.add(String(l.commerce_id).trim())
    }
    return out
  }, [licenses])

  const orphanCommerceCount = useMemo(() => {
    return (rows || []).filter((r) => {
      const id = String(r?.id || '').trim()
      return id && !commerceIdsLinked.has(id)
    }).length
  }, [rows, commerceIdsLinked])

  const load = useCallback(async () => {
    setLoading(true)
    setHistoryError(null)
    const histFn = window.api?.license?.listCommerceDeactivationHistory
    const histPromise =
      typeof histFn === 'function'
        ? histFn()
        : Promise.resolve({ ok: true, data: [] })

    const licFn = window.api?.license?.getAll
    const licPromise =
      typeof licFn === 'function' ? licFn() : Promise.resolve({ ok: true, data: [] })

    const demoFn = window.api?.license?.listDemoOnboarding
    const demoPromise =
      typeof demoFn === 'function' ? demoFn() : Promise.resolve({ ok: true, data: [] })

    const [res, hist, licRes, demoRes] = await Promise.all([
      window.api.license.listCommerces(),
      histPromise,
      licPromise,
      demoPromise
    ])

    if (res?.ok) setRows(Array.isArray(res.data) ? res.data : [])
    else message.error(res?.error || t('comercios.loadError'))

    if (licRes?.ok) setLicenses(Array.isArray(licRes.data) ? licRes.data : [])
    else setLicenses([])

    if (demoRes?.ok) setDemos(Array.isArray(demoRes.data) ? demoRes.data : [])
    else setDemos([])

    if (hist?.ok) setHistoryRows(Array.isArray(hist.data) ? hist.data : [])
    else {
      setHistoryRows([])
      if (hist?.error) setHistoryError(hist.error)
    }
    setLoading(false)
  }, [t])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const list = rows || []
    if (!onlyActive) return list
    return list.filter((r) => {
      const id = String(r?.id || '').trim()
      if (!id || !commerceIdsLinked.has(id)) return false
      if (r?.activo === false) return false
      if (inactiveCommerceIdsFromLicenses.has(id)) return false
      return true
    })
  }, [rows, onlyActive, commerceIdsLinked, inactiveCommerceIdsFromLicenses])

  const inactiveRows = useMemo(() => {
    return (rows || [])
      .filter((r) => {
        const id = String(r?.id || '').trim()
        if (!id || !commerceIdsLinked.has(id)) return false
        const byCommerce = r?.activo === false
        const byLicense = inactiveCommerceIdsFromLicenses.has(id)
        return byCommerce || byLicense
      })
      .map((r) => {
        const id = String(r?.id || '').trim()
        const byCommerce = r?.activo === false
        const byLicense = inactiveCommerceIdsFromLicenses.has(id)
        let tag = 'license'
        if (byCommerce && byLicense) tag = 'both'
        else if (byCommerce) tag = 'commerce'
        return { ...r, _inactiveTag: tag }
      })
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime()
        const tb = new Date(b.updated_at || b.created_at || 0).getTime()
        return tb - ta
      })
  }, [rows, commerceIdsLinked, inactiveCommerceIdsFromLicenses])

  const inactiveColumns = useMemo(() => [
    ...columnsBase(t),
    {
      title: t('comercios.inactiveColCause'),
      key: 'cause',
      width: 200,
      render: (_, row) => {
        if (row._inactiveTag === 'both') {
          return (
            <Space size={4} wrap>
              <Tag>{t('comercios.inactiveCauseCommerce')}</Tag>
              <Tag>{t('comercios.inactiveCauseLicense')}</Tag>
            </Space>
          )
        }
        if (row._inactiveTag === 'commerce') return <Tag>{t('comercios.inactiveCauseCommerce')}</Tag>
        return <Tag>{t('comercios.inactiveCauseLicense')}</Tag>
      }
    }
  ], [t])

  const columns = useMemo(() => columnsBase(t), [t])

  const historyColumns = useMemo(() => [
    {
      title: t('comercios.historyColDate'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—')
    },
    {
      title: t('comercios.historyColCommerceId'),
      dataIndex: 'commerce_id',
      key: 'commerce_id',
      width: 180,
      ellipsis: true,
      render: (v) => v || '—'
    },
    {
      title: t('comercios.historyColLicense'),
      key: 'lic_clave',
      width: 160,
      ellipsis: true,
      render: (_, row) => snapshotLicenseKey(row)
    },
    {
      title: t('comercios.historyColName'),
      key: 'snap_nombre',
      ellipsis: true,
      render: (_, row) => snapshotDisplayName(row)
    },
    {
      title: t('comercios.historyColActor'),
      dataIndex: 'actor_email',
      key: 'actor_email',
      ellipsis: true,
      render: (v) => v || '—'
    },
    {
      title: t('comercios.historyColReason'),
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      render: (code) =>
        t(`comercios.historyReason.${code}`, { defaultValue: code || '—' })
    }
  ], [t])

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>{t('comercios.title')}</Title>
        <Space wrap>
          <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => navigate('/licencias')}>
            {t('comercios.goLicenses')}
          </Button>
          <Button icon={<CloudOutlined />} onClick={() => navigate('/backup')}>
            {t('comercios.goBackup')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            {t('comercios.refresh')}
          </Button>
        </Space>
      </div>

      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('comercios.alertTitle')} description={t('comercios.alertDesc')} />

      {orphanCommerceCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('comercios.orphanBannerTitle', { count: orphanCommerceCount })}
          description={t('comercios.orphanBannerDesc')}
        />
      ) : null}

      <Card title={t('comercios.activeCardTitle')} style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space wrap align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: 'rgba(0,0,0,0.65)' }}>{t('comercios.tableHint')}</span>
            <Space>
              <span>{t('comercios.onlyActive')}</span>
              <Switch checked={onlyActive} onChange={setOnlyActive} />
            </Space>
          </Space>
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }}
            locale={{ emptyText: t('comercios.empty') }}
            scroll={{ x: 960 }}
          />
        </Space>
      </Card>

      <Card title={t('comercios.historyCardTitle')} style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">{t('comercios.historyHint')}</Text>
          {historyError ? (
            <Alert type="warning" showIcon message={t('comercios.historyLoadError')} description={historyError} />
          ) : null}
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={historyColumns}
            dataSource={historyRows}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: t('comercios.historyEmpty') }}
            scroll={{ x: 980 }}
          />
        </Space>
      </Card>

      <Card title={t('comercios.inactiveCardTitle')}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text type="secondary">{t('comercios.inactiveHint')}</Text>
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={inactiveColumns}
            dataSource={inactiveRows}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: t('comercios.inactiveEmpty') }}
            scroll={{ x: 1040 }}
          />
        </Space>
      </Card>
    </div>
  )
}

export default Comercios
