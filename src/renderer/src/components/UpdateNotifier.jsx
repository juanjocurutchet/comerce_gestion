import React, { useEffect, useState } from 'react'
import { notification, Button, Progress, Space, Typography } from 'antd'
import { CloudDownloadOutlined, ReloadOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function UpdateNotifier() {
  const [downloadedVersion, setDownloadedVersion] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [percent, setPercent] = useState(0)
  const [notifApi, contextHolder] = notification.useNotification()

  useEffect(() => {
    const off = []

    off.push(window.api.updater.onAvailable((info) => {
      setDownloading(true)
      notifApi.info({
        key: 'update-downloading',
        message: `Nueva versión disponible: v${info.version}`,
        description: 'Descargando actualización en segundo plano...',
        icon: <CloudDownloadOutlined style={{ color: '#1677ff' }} />,
        duration: 0
      })
    }))

    off.push(window.api.updater.onProgress((data) => {
      setPercent(data.percent)
      notifApi.open({
        key: 'update-downloading',
        message: `Descargando actualización... ${data.percent}%`,
        description: <Progress percent={data.percent} size="small" showInfo={false} />,
        icon: <CloudDownloadOutlined style={{ color: '#1677ff' }} />,
        duration: 0
      })
    }))

    off.push(window.api.updater.onDownloaded((info) => {
      setDownloading(false)
      setDownloadedVersion(info.version)
      notifApi.destroy('update-downloading')
      notifApi.success({
        key: 'update-ready',
        message: `v${info.version} lista para instalar`,
        description: (
          <Space direction="vertical" size={8} style={{ marginTop: 4 }}>
            <Text>La actualización fue descargada. Reiniciá la app para aplicarla.</Text>
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => window.api.updater.install()}
            >
              Reiniciar ahora
            </Button>
          </Space>
        ),
        duration: 0
      })
    }))

    off.push(window.api.updater.onError(() => {
      setDownloading(false)
      notifApi.destroy('update-downloading')
    }))

    return () => off.forEach(unsub => unsub())
  }, [notifApi])

  return contextHolder
}
