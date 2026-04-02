import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Badge, Space, Button, Tooltip, theme as antTheme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, AppstoreOutlined, InboxOutlined,
  ShoppingCartOutlined, TeamOutlined, WalletOutlined,
  BarChartOutlined, UserOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined,
  ShopOutlined, SettingOutlined, CloudUploadOutlined,
  BulbOutlined, BulbFilled, FileTextOutlined, SafetyCertificateOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useClientStore } from '../store/clientStore'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const ALL_MENU_ITEMS = [
  { key: '/dashboard',    icon: <DashboardOutlined />,   label: 'Dashboard',      feature: null },
  { type: 'divider' },
  { key: '/ventas',       icon: <ShoppingCartOutlined />, label: 'Ventas',         feature: 'ventas' },
  { key: '/cotizaciones', icon: <FileTextOutlined />,     label: 'Cotizaciones',   feature: 'cotizaciones' },
  { key: '/productos',    icon: <AppstoreOutlined />,     label: 'Productos',      feature: 'productos' },
  { key: '/stock',        icon: <InboxOutlined />,        label: 'Stock',          feature: 'stock' },
  { key: '/proveedores',  icon: <TeamOutlined />,         label: 'Proveedores',    feature: 'proveedores' },
  { key: '/caja',         icon: <WalletOutlined />,       label: 'Caja',           feature: 'caja' },
  { type: 'divider' },
  { key: '/reportes',     icon: <BarChartOutlined />,     label: 'Reportes',       feature: 'reportes' },
  { key: '/usuarios',     icon: <UserOutlined />,         label: 'Usuarios',       feature: 'usuarios' },
  { type: 'divider' },
  { key: '/backup',       icon: <CloudUploadOutlined />,        label: 'Backup',         feature: 'backup' },
  { key: '/configuracion',icon: <SettingOutlined />,            label: 'Configuración',  feature: 'configuracion' },
  { key: '/licencias',    icon: <SafetyCertificateOutlined />,  label: 'Licencias',      feature: '__admin__' },
  { type: 'divider' },
  { key: '/ayuda',        icon: <QuestionCircleOutlined />,     label: 'Ayuda',          feature: null }
]

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const { features, isAdmin, clientName, logo, logoIcon } = useClientStore()
  const { token } = antTheme.useToken()

  const menuItems = ALL_MENU_ITEMS.filter(item => {
    if (item.type === 'divider') return true
    if (item.feature === '__admin__') return isAdmin
    return item.feature === null || features[item.feature]
  })

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: user?.nombre },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Cerrar sesión', danger: true }
    ],
    onClick: ({ key }) => {
      if (key === 'logout') logout()
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 100
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: (logo && !collapsed) || (logoIcon && collapsed) ? 0 : '0 16px',
          overflow: 'hidden'
        }}>
          {logo && !collapsed ? (
            <img src={logo} alt={clientName} style={{ width: '100%', height: 64, objectFit: 'contain' }} />
          ) : logoIcon && collapsed ? (
            <img src={logoIcon} alt={clientName} style={{ width: '100%', height: 64, objectFit: 'fill' }} />
          ) : (
            <>
              <ShopOutlined style={{ fontSize: 24, color: '#1677ff' }} />
              {!collapsed && (
                <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap', marginLeft: 10 }}>
                  {clientName || 'Nexo Commerce'}
                </Text>
              )}
            </>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8, border: 'none' }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: dark
            ? '0 1px 4px rgba(0,0,0,0.4)'
            : '0 1px 4px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          transition: 'background 0.25s'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18 }}
          />

          <Space size={16}>
            <Tooltip title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
              <Button
                type="text"
                onClick={toggle}
                icon={
                  dark
                    ? <BulbFilled style={{ fontSize: 18, color: '#faad14' }} />
                    : <BulbOutlined style={{ fontSize: 18 }} />
                }
              />
            </Tooltip>

            <Badge count={0} size="small">
              <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
            </Badge>

            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#1677ff' }} icon={<UserOutlined />} size="small" />
                <Text style={{ fontWeight: 500 }}>{user?.nombre}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
