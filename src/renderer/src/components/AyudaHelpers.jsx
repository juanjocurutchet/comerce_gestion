import React from 'react'
import { Typography, Card, Space, Alert } from 'antd'

const { Text } = Typography

export const Section = ({ icon, title, color = '#1677ff', children }) => (
  <Card
    style={{ marginBottom: 16 }}
    styles={{ header: { borderBottom: `3px solid ${color}` } }}
    title={
      <Space>
        {React.cloneElement(icon, { style: { color, fontSize: 18 } })}
        <Text strong style={{ fontSize: 16 }}>{title}</Text>
      </Space>
    }
  >
    {children}
  </Card>
)

export const Paso = ({ numero, texto }) => (
  <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
    <div style={{
      minWidth: 26, height: 26, borderRadius: '50%',
      background: '#1677ff', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, flexShrink: 0
    }}>
      {numero}
    </div>
    <Text style={{ paddingTop: 4 }}>{texto}</Text>
  </div>
)

export const Tip = ({ children }) => (
  <Alert
    type="info"
    showIcon
    style={{ marginTop: 12, marginBottom: 4 }}
    message={children}
  />
)
