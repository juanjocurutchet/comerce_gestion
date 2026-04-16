import React, { useEffect, useState, useRef } from 'react'
import {
  Card, Button, Typography, Table, Space, Tag, Popconfirm,
  message, Alert, Row, Col, Statistic, Switch, InputNumber,
  Tooltip, Modal, Divider, Form, Input
} from 'antd'
import {
  CloudUploadOutlined, ReloadOutlined, DeleteOutlined,
  RollbackOutlined, FolderOpenOutlined, CheckCircleOutlined,
  ClockCircleOutlined, WarningOutlined, DownloadOutlined, UploadOutlined,
  LoginOutlined, LogoutOutlined, CloudSyncOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

const Backup = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [runningBackup, setRunningBackup] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [cloudLoading, setCloudLoading] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [keepLast, setKeepLast] = useState(10)
  const [cloudForm] = Form.useForm()
  const fileImportRef = useRef(null)
  const { t } = useTranslation()
  const isPwa = typeof window !== 'undefined' && window.__IS_PWA__
  const hasJsonSnapshot =
    typeof window !== 'undefined' && typeof window.api?.backup?.exportWeb === 'function'
  const hasProductsSync =
    typeof window !== 'undefined' && typeof window.api?.sync?.getStatus === 'function'
  const hasCloudAuth =
    typeof window !== 'undefined' && typeof window.api?.cloudAuth?.getSession === 'function'

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [backupRes, syncRes] = await Promise.all([
      window.api.backup.getList(),
      hasProductsSync ? window.api.sync.getStatus() : Promise.resolve(null)
    ])
    if (backupRes.ok) {
      setData(backupRes.data)
      setAutoBackup(backupRes.data.autoBackup)
      setKeepLast(backupRes.data.keepLast)
    }
    if (syncRes?.ok) {
      setSyncStatus(syncRes.data)
    }
    setLoading(false)
  }

  const handleCloudLogin = async (values) => {
    if (!window.api?.cloudAuth?.signIn) return
    setCloudLoading(true)
    const res = await window.api.cloudAuth.signIn(values.email, values.password)
    setCloudLoading(false)
    if (!res.ok) {
      message.error(res.error || t('common.error'))
      return
    }
    cloudForm.resetFields(['password'])
    message.success(t('backup.cloudLoginSuccess'))
    loadData()
  }

  const handleCloudLogout = async () => {
    if (!window.api?.cloudAuth?.signOut) return
    setCloudLoading(true)
    const res = await window.api.cloudAuth.signOut()
    setCloudLoading(false)
    if (!res.ok) {
      message.error(res.error || t('common.error'))
      return
    }
    message.success(t('backup.cloudLogoutSuccess'))
    loadData()
  }

  const handleBackupNow = async () => {
    setRunningBackup(true)
    const res = await window.api.backup.run()
    setRunningBackup(false)
    if (res.ok) {
      message.success(t('backup.backupSuccess', { file: res.data.file }))
      loadData()
    } else {
      message.error(res.error || t('backup.backupError'))
    }
  }

  const handleChooseDir = async () => {
    const res = await window.api.backup.chooseDir()
    if (res.ok) {
      await window.api.config.setMany({ backupDir: res.data })
      message.success(t('backup.configDirUpdated'))
      loadData()
    }
  }

  const handleToggleAuto = async (checked) => {
    setAutoBackup(checked)
    await window.api.config.setMany({ backupAuto: String(checked) })
    message.success(checked ? t('backup.autoActivated') : t('backup.autoDeactivated'))
  }

  const handleKeepLast = async (val) => {
    if (!val || val < 1) return
    setKeepLast(val)
    await window.api.config.setMany({ backupKeepLast: String(val) })
  }

  const handleRestore = async (backup) => {
    Modal.confirm({
      title: t('backup.restoreTitle'),
      content: (
        <div>
          <p>{t('backup.restoreQuestion', { date: dayjs(backup.fecha).format('DD/MM/YYYY HH:mm') })}</p>
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            message={t('backup.restoreWarning')}
            showIcon
          />
        </div>
      ),
      okText: t('backup.restoreBtn'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        const res = await window.api.backup.restore(backup.path)
        if (res.ok) {
          message.success(t('backup.restoreSuccess'))
        } else {
          message.error(res.error || t('common.error'))
        }
      }
    })
  }

  const handleDelete = async (backup) => {
    const res = await window.api.backup.delete(backup.path)
    if (res.ok) { message.success(t('backup.deleteSuccess')); loadData() }
    else message.error(res.error)
  }

  const handleExportWeb = async () => {
    if (!window.api?.backup?.exportWeb) {
      message.error(t('backup.pwaExportUnavailable'))
      return
    }
    setExporting(true)
    const res = await window.api.backup.exportWeb()
    setExporting(false)
    if (!res.ok) {
      message.error(res.error || t('backup.pwaExportError'))
      return
    }
    const blob = new Blob([res.data.json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexo-commerce-backup-${dayjs().format('YYYY-MM-DD_HHmm')}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success(t('backup.pwaExportSuccess'))
    loadData()
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      Modal.confirm({
        title: t('backup.pwaImportConfirmTitle'),
        content: t('backup.pwaImportConfirmBody'),
        okText: t('backup.pwaImportOk'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: async () => {
          if (!window.api?.backup?.importWeb) {
            message.error(t('backup.pwaExportUnavailable'))
            return
          }
          setImporting(true)
          const res = await window.api.backup.importWeb(text)
          setImporting(false)
          if (!res.ok) {
            message.error(res.error || t('common.error'))
            return
          }
          message.success(t('backup.pwaImportSuccess'))
          window.location.reload()
        }
      })
    }
    reader.onerror = () => message.error(t('backup.pwaImportReadError'))
    reader.readAsText(file, 'UTF-8')
  }

  const runSyncAction = async (action, successKey, options = {}) => {
    if (!window.api?.sync?.[action]) return
    setSyncing(true)
    const res = await window.api.sync[action](options)
    setSyncing(false)
    if (!res.ok) {
      message.error(res.error || t('common.error'))
      return
    }
    message.success(t(successKey, res.data || {}))
    loadData()
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const lastBackupDate = data?.lastDate ? dayjs(data.lastDate) : null
  const horasPasadas = lastBackupDate ? dayjs().diff(lastBackupDate, 'hour') : null
  const backupStatus = !lastBackupDate ? 'never'
    : horasPasadas < 24 ? 'ok'
    : horasPasadas < 48 ? 'warn'
    : 'danger'

  const columns = [
    {
      title: t('backup.colFile'),
      dataIndex: 'name',
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13, fontFamily: 'monospace' }}>{v}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.path}</Text>
        </Space>
      )
    },
    {
      title: t('backup.colDate'),
      dataIndex: 'fecha',
      width: 160,
      render: v => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(b.fecha) - new Date(a.fecha),
      defaultSortOrder: 'ascend'
    },
    {
      title: t('backup.colSize'),
      dataIndex: 'size',
      width: 90,
      render: v => <Tag>{formatSize(v)}</Tag>,
      align: 'center'
    },
    {
      title: t('backup.colActions'),
      key: 'acc',
      width: 100,
      align: 'center',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('backup.restoreTooltip')}>
            <Popconfirm
              title={t('backup.restoreConfirmTitle')}
              description={t('backup.restoreConfirmDesc')}
              onConfirm={() => handleRestore(r)}
              okText={t('backup.restoreBtn')} cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<RollbackOutlined />} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title={t('backup.deleteTooltip')}>
            <Popconfirm title={t('backup.deleteConfirm')} onConfirm={() => handleDelete(r)} okText={t('common.yes')} cancelText={t('common.no')}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>{t('backup.title')}</Title>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>{t('common.refresh')}</Button>
          {!isPwa && (
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              loading={runningBackup}
              onClick={handleBackupNow}
            >
              {t('backup.backupNow')}
            </Button>
          )}
          {hasJsonSnapshot && (
            <>
              <Button
                type={isPwa ? 'primary' : 'default'}
                icon={<DownloadOutlined />}
                loading={exporting}
                onClick={handleExportWeb}
              >
                {t('backup.pwaExportBtn')}
              </Button>
              <Button icon={<UploadOutlined />} loading={importing} onClick={() => fileImportRef.current?.click()}>
                {t('backup.pwaImportBtn')}
              </Button>
              <input
                ref={fileImportRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </>
          )}
        </Space>
      </div>

      {hasJsonSnapshot && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={isPwa ? t('backup.pwaInfoTitle') : t('backup.jsonSnapshotTitle')}
          description={isPwa ? t('backup.pwaInfoDesc') : t('backup.jsonSnapshotDesc')}
        />
      )}

      {isPwa && hasProductsSync && (
        <Card title={t('backup.syncTitle')} style={{ marginBottom: 16 }}>
          {!syncStatus?.configured ? (
            <Alert
              type="warning"
              showIcon
              message={t('backup.syncNotConfiguredTitle')}
              description={t('backup.syncNotConfiguredDesc')}
            />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message={t('backup.syncInfoTitle')}
                description={t('backup.syncInfoDesc')}
              />
              {hasCloudAuth && !syncStatus?.cloudSession && (
                <Card size="small" title={t('backup.cloudLoginTitle')}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {t('backup.cloudLoginDesc')}
                  </Text>
                  <Form form={cloudForm} layout="vertical" onFinish={handleCloudLogin}>
                    <Form.Item
                      name="email"
                      label={t('backup.cloudEmail')}
                      rules={[{ required: true, message: t('backup.cloudEmailRequired') }]}
                    >
                      <Input placeholder="admin@tucomercio.com" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label={t('backup.cloudPassword')}
                      rules={[{ required: true, message: t('backup.cloudPasswordRequired') }]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={cloudLoading}>
                      {t('backup.cloudLoginBtn')}
                    </Button>
                  </Form>
                </Card>
              )}
              {hasCloudAuth && syncStatus?.cloudSession && (
                <Alert
                  type="success"
                  showIcon
                  action={
                    <Button size="small" icon={<LogoutOutlined />} loading={cloudLoading} onClick={handleCloudLogout}>
                      {t('backup.cloudLogoutBtn')}
                    </Button>
                  }
                  message={t('backup.cloudConnectedTitle')}
                  description={t('backup.cloudConnectedDesc', {
                    email: syncStatus.cloudSession.email || '-',
                    expires: syncStatus.cloudSession.expires_at
                      ? dayjs.unix(syncStatus.cloudSession.expires_at).format('DD/MM/YYYY HH:mm')
                      : '-'
                  })}
                />
              )}
              {hasCloudAuth && syncStatus?.cloudSession && syncStatus?.cloudMembershipMatch === false && (
                <Alert
                  type="error"
                  showIcon
                  message={t('backup.cloudCommerceMismatchTitle')}
                  description={t('backup.cloudCommerceMismatchDesc', {
                    local: syncStatus?.commerceId || '-',
                    list: (syncStatus?.cloudMemberships || []).join(', ') || '-'
                  })}
                />
              )}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Statistic
                    title={t('backup.syncCommerceId')}
                    value={syncStatus?.commerceId || '-'}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title={t('backup.syncLastPush')}
                    value={syncStatus?.lastPushAt ? dayjs(syncStatus.lastPushAt).format('DD/MM/YYYY HH:mm') : t('common.never')}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title={t('backup.syncLastPull')}
                    value={syncStatus?.lastPullAt ? dayjs(syncStatus.lastPullAt).format('DD/MM/YYYY HH:mm') : t('common.never')}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
              </Row>
              <Space wrap>
                <Button icon={<DownloadOutlined />} loading={syncing || cloudLoading} disabled={!syncStatus?.cloudSession || syncStatus?.cloudMembershipMatch === false} onClick={() => runSyncAction('pullProducts', 'backup.syncPullSuccess')}>
                  {t('backup.syncPullBtn')}
                </Button>
                <Button icon={<UploadOutlined />} loading={syncing || cloudLoading} disabled={!syncStatus?.cloudSession || syncStatus?.cloudMembershipMatch === false} onClick={() => runSyncAction('pushProducts', 'backup.syncPushSuccess')}>
                  {t('backup.syncPushBtn')}
                </Button>
                <Button type="primary" icon={<CloudSyncOutlined />} loading={syncing || cloudLoading} disabled={!syncStatus?.cloudSession || syncStatus?.cloudMembershipMatch === false} onClick={() => runSyncAction('syncProducts', 'backup.syncRunSuccess')}>
                  {t('backup.syncRunBtn')}
                </Button>
                <Button loading={syncing || cloudLoading} disabled={!syncStatus?.cloudSession || syncStatus?.cloudMembershipMatch === false} onClick={() => runSyncAction('syncProducts', 'backup.syncRunSuccess', { full: true })}>
                  {t('backup.syncFullBtn')}
                </Button>
              </Space>
            </Space>
          )}
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title={t('backup.statLastBackup')}
              value={lastBackupDate ? lastBackupDate.format('DD/MM/YYYY HH:mm') : t('common.never')}
              prefix={
                backupStatus === 'ok' ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                : backupStatus === 'warn' ? <WarningOutlined style={{ color: '#faad14' }} />
                : backupStatus === 'danger' ? <WarningOutlined style={{ color: '#ff4d4f' }} />
                : <ClockCircleOutlined style={{ color: '#999' }} />
              }
              valueStyle={{
                fontSize: 14,
                color: backupStatus === 'ok' ? '#52c41a' : backupStatus === 'never' ? '#999' : backupStatus === 'warn' ? '#faad14' : '#ff4d4f'
              }}
            />
            {lastBackupDate && (
              <Text type="secondary" style={{ fontSize: 12 }}>{lastBackupDate.fromNow()}</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title={t('backup.statSaved')}
              value={data?.backups?.length || 0}
              suffix={t('backup.statMax', { max: keepLast })}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <div style={{ marginBottom: 8 }}>
              <Text strong>{t('backup.statAutoTitle')}</Text>
            </div>
            <Switch
              checked={autoBackup}
              onChange={handleToggleAuto}
              checkedChildren={t('backup.autoOn')}
              unCheckedChildren={t('backup.autoOff')}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              {t('backup.statAutoDesc')}
            </Text>
          </Card>
        </Col>
      </Row>

      {!isPwa && (
      <Card title={t('backup.configTitle')} style={{ marginBottom: 16 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>{t('backup.configDirLabel')}</Text>
              <Space style={{ width: '100%' }}>
                <Text
                  code
                  style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}
                  ellipsis
                >
                  {data?.backupDir || '...'}
                </Text>
                <Button icon={<FolderOpenOutlined />} size="small" onClick={handleChooseDir}>
                  {t('backup.configDirChange')}
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4}>
              <Text strong>{t('backup.configKeepLabel')}</Text>
              <InputNumber
                min={1} max={50} value={keepLast}
                onChange={handleKeepLast}
                addonAfter={t('backup.configKeepSuffix')}
                style={{ width: 160 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('backup.configKeepDesc')}
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>
      )}

      <Card title={t('backup.availableTitle')}>
        {backupStatus === 'danger' && (
          <Alert
            message={t('backup.alertDanger')}
            type="error" showIcon style={{ marginBottom: 16 }}
          />
        )}
        {backupStatus === 'never' && (
          <Alert
            message={t('backup.alertNever')}
            type="warning" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Table
          columns={columns}
          dataSource={data?.backups || []}
          rowKey="path"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showTotal: total => t('backup.pagTotal', { total }) }}
          locale={{ emptyText: isPwa ? t('backup.pwaNoFileList') : t('backup.noBackups') }}
        />
      </Card>
    </div>
  )
}

export default Backup
