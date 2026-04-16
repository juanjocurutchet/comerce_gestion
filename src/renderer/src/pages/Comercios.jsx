import React from 'react'
import { Typography, Card, Space, Button, Alert, Steps } from 'antd'
import { SafetyCertificateOutlined, KeyOutlined, CloudOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const { Title, Paragraph } = Typography

const Comercios = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

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
        </Space>
      </div>

      <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('comercios.alertTitle')} description={t('comercios.alertDesc')} />

      <Card>
        <Paragraph>{t('comercios.intro')}</Paragraph>
        <Steps
          direction="vertical"
          size="small"
          current={-1}
          items={[
            {
              title: t('comercios.step1Title'),
              description: t('comercios.step1Desc'),
              icon: <SafetyCertificateOutlined />
            },
            {
              title: t('comercios.step2Title'),
              description: t('comercios.step2Desc'),
              icon: <KeyOutlined />
            },
            {
              title: t('comercios.step3Title'),
              description: t('comercios.step3Desc'),
              icon: <CloudOutlined />
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default Comercios
