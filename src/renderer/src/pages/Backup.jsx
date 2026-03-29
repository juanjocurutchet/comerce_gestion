import React, { useEffect, useState } from 'react'
import {
  Card, Button, Typography, Table, Space, Tag, Popconfirm,
  message, Alert, Row, Col, Statistic, Switch, InputNumber,
  Tooltip, Modal, Divider
} from 'antd'
import {
  CloudUploadOutlined, ReloadOutlined, DeleteOutlined,
  RollbackOutlined, FolderOpenOutlined, CheckCircleOutlined,
  ClockCircleOutlined, WarningOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

export default function Backup() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [runningBackup, setRunningBackup] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [keepLast, setKeepLast] = useState(10)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const res = await window.api.backup.getList()
    if (res.ok) {
      setData(res.data)
      setAutoBackup(res.data.autoBackup)
      setKeepLast(res.data.keepLast)
    }
    setLoading(false)
  }

  async function handleBackupNow() {
    setRunningBackup(true)
    const res = await window.api.backup.run()
    setRunningBackup(false)
    if (res.ok) {
      message.success(`Backup creado: ${res.data.file}`)
      loadData()
    } else {
      message.error(res.error || 'Error al crear backup')
    }
  }

  async function handleChooseDir() {
    const res = await window.api.backup.chooseDir()
    if (res.ok) {
      await window.api.config.setMany({ backupDir: res.data })
      message.success('Carpeta de backup actualizada')
      loadData()
    }
  }

  async function handleToggleAuto(checked) {
    setAutoBackup(checked)
    await window.api.config.setMany({ backupAuto: String(checked) })
    message.success(checked ? 'Backup automático activado' : 'Backup automático desactivado')
  }

  async function handleKeepLast(val) {
    if (!val || val < 1) return
    setKeepLast(val)
    await window.api.config.setMany({ backupKeepLast: String(val) })
  }

  async function handleRestore(backup) {
    Modal.confirm({
      title: 'Restaurar backup',
      content: (
        <div>
          <p>¿Estás seguro de restaurar el backup del <b>{dayjs(backup.fecha).format('DD/MM/YYYY HH:mm')}</b>?</p>
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            message="Se hará un backup del estado actual antes de restaurar. La app se cerrará para aplicar los cambios."
            showIcon
          />
        </div>
      ),
      okText: 'Restaurar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        const res = await window.api.backup.restore(backup.path)
        if (res.ok) {
          message.success('Backup restaurado. Reiniciá la aplicación para ver los cambios.')
        } else {
          message.error(res.error || 'Error al restaurar')
        }
      }
    })
  }

  async function handleDelete(backup) {
    const res = await window.api.backup.delete(backup.path)
    if (res.ok) { message.success('Backup eliminado'); loadData() }
    else message.error(res.error)
  }

  function formatSize(bytes) {
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
      title: 'Archivo',
      dataIndex: 'name',
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13, fontFamily: 'monospace' }}>{v}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.path}</Text>
        </Space>
      )
    },
    {
      title: 'Fecha',
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
      title: 'Tamaño',
      dataIndex: 'size',
      width: 90,
      render: v => <Tag>{formatSize(v)}</Tag>,
      align: 'center'
    },
    {
      title: 'Acciones',
      key: 'acc',
      width: 100,
      align: 'center',
      render: (_, r) => (
        <Space>
          <Tooltip title="Restaurar este backup">
            <Popconfirm
              title="¿Restaurar este backup?"
              description="El estado actual se guardará como backup antes de restaurar."
              onConfirm={() => handleRestore(r)}
              okText="Restaurar" cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<RollbackOutlined />} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm title="¿Eliminar este backup?" onConfirm={() => handleDelete(r)} okText="Sí" cancelText="No">
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
        <Title level={4} style={{ margin: 0 }}>Backup de Base de Datos</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>Actualizar</Button>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            loading={runningBackup}
            onClick={handleBackupNow}
          >
            Hacer Backup Ahora
          </Button>
        </Space>
      </div>

      {/* Estado del último backup */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Último Backup"
              value={lastBackupDate ? lastBackupDate.format('DD/MM/YYYY HH:mm') : 'Nunca'}
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
              title="Backups Guardados"
              value={data?.backups?.length || 0}
              suffix={`/ ${keepLast} máx`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <div style={{ marginBottom: 8 }}>
              <Text strong>Backup Automático Diario</Text>
            </div>
            <Switch
              checked={autoBackup}
              onChange={handleToggleAuto}
              checkedChildren="Activado"
              unCheckedChildren="Desactivado"
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              Se ejecuta al iniciar la app si pasaron más de 24hs
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Configuración */}
      <Card title="Configuración de Backup" style={{ marginBottom: 16 }}>
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>Carpeta de destino</Text>
              <Space style={{ width: '100%' }}>
                <Text
                  code
                  style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}
                  ellipsis
                >
                  {data?.backupDir || '...'}
                </Text>
                <Button icon={<FolderOpenOutlined />} size="small" onClick={handleChooseDir}>
                  Cambiar
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={4}>
              <Text strong>Cantidad de backups a conservar</Text>
              <InputNumber
                min={1} max={50} value={keepLast}
                onChange={handleKeepLast}
                addonAfter="backups"
                style={{ width: 160 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Los más antiguos se eliminan automáticamente
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Lista de backups */}
      <Card title="Backups Disponibles">
        {backupStatus === 'danger' && (
          <Alert
            message="Hace más de 48hs que no se realiza un backup. Hacé uno ahora."
            type="error" showIcon style={{ marginBottom: 16 }}
          />
        )}
        {backupStatus === 'never' && (
          <Alert
            message="No hay backups registrados. Te recomendamos hacer uno ahora."
            type="warning" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Table
          columns={columns}
          dataSource={data?.backups || []}
          rowKey="path"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, showTotal: t => `${t} backups` }}
          locale={{ emptyText: 'Sin backups' }}
        />
      </Card>
    </div>
  )
}
