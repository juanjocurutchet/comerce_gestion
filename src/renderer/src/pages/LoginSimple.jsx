import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const { Title } = Typography

const LoginSimple = () => {
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      if (!window.api?.usuarios?.login) {
        alert(
          'La API no está inicializada. Si usás la PWA, abrí /index-pwa.html o reiniciá con npm run dev:pwa y entrá por http://localhost:3000/ (debe cargar la versión web).'
        )
        return
      }
      const u = String(values.username ?? '').trim()
      const p = String(values.password ?? '')
      const res = await window.api.usuarios.login(u, p)

      if (res?.ok && res.data) {
        setUser(res.data)
        navigate('/dashboard')
      } else {
        alert(res?.error || 'Credenciales inválidas')
      }
    } catch (error) {
      alert(`Error en el login: ${error?.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card style={{ width: 380, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Nexo Commerce</Title>
          <p>Sistema de Gestión Comercial</p>
        </div>

        <Form
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ username: 'admin', password: 'admin' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Ingrese usuario' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Usuario" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Ingrese contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              size="large"
            >
              Ingresar
            </Button>
          </Form.Item>
        </Form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#999' }}>
          Usuario por defecto: admin / admin
        </p>
      </Card>
    </div>
  )
}

export default LoginSimple