import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Badge, Space, Button, Tooltip, theme as antTheme } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined, AppstoreOutlined, InboxOutlined,
  ShoppingCartOutlined, TeamOutlined, WalletOutlined,
  BarChartOutlined, UserOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined,
  SettingOutlined, CloudUploadOutlined,
  BulbOutlined, BulbFilled, FileTextOutlined, SafetyCertificateOutlined,
  QuestionCircleOutlined, UsergroupAddOutlined, MinusCircleOutlined, TagsOutlined,
  ShopOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useLicenseStore } from '../store/licenseStore'
import { TrialUpgradeModal } from '../components/LicenseGuard'
import MustChangeCloudPasswordModal from '../components/MustChangeCloudPasswordModal'
import nexoLogo from '../assets/nexo-commerce-logo.png'
import nexoIcon from '../assets/nexo-commerce-icon.png'
import { useThemeStore } from '../store/themeStore'
import { useClientStore } from '../store/clientStore'
import { useLanguageStore } from '../store/languageStore'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const MENU_DEFS = [
  { key: '/dashboard',    icon: <DashboardOutlined />,          navKey: 'dashboard',     feature: null },
  { type: 'divider' },
  { key: '/ventas',       icon: <ShoppingCartOutlined />,        navKey: 'ventas',        feature: 'ventas' },
  { key: '/cotizaciones', icon: <FileTextOutlined />,            navKey: 'cotizaciones',  feature: 'cotizaciones' },
  { key: '/productos',    icon: <AppstoreOutlined />,            navKey: 'productos',     feature: 'productos' },
  { key: '/stock',        icon: <InboxOutlined />,               navKey: 'stock',         feature: 'stock' },
  { key: '/proveedores',  icon: <TeamOutlined />,                navKey: 'proveedores',   feature: 'proveedores' },
  { key: '/clientes',      icon: <UsergroupAddOutlined />,       navKey: 'clientes',      feature: null },
  { key: '/gastos',        icon: <MinusCircleOutlined />,        navKey: 'gastos',        feature: null },
  { key: '/listas-precio', icon: <TagsOutlined />,               navKey: 'listasPrecio',  feature: null },
  { key: '/caja',         icon: <WalletOutlined />,              navKey: 'caja',          feature: 'caja' },
  { type: 'divider' },
  { key: '/reportes',     icon: <BarChartOutlined />,            navKey: 'reportes',      feature: 'reportes' },
  { key: '/usuarios',     icon: <UserOutlined />,                navKey: 'usuarios',      feature: 'usuarios' },
  { type: 'divider' },
  { key: '/backup',       icon: <CloudUploadOutlined />,         navKey: 'backup',        feature: 'backup' },
  { key: '/configuracion',icon: <SettingOutlined />,             navKey: 'configuracion', feature: 'configuracion' },
  { key: '/comercios',    icon: <ShopOutlined />,                navKey: 'comercios',     feature: '__admin__' },
  { key: '/licencias',    icon: <SafetyCertificateOutlined />,   navKey: 'licencias',     feature: '__admin__' },
  { type: 'divider' },
  { key: '/ayuda',        icon: <QuestionCircleOutlined />,      navKey: 'ayuda',         feature: null }
]

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { status } = useLicenseStore()
  const { dark, toggle } = useThemeStore()
  const { features, isAdmin, logo, logoIcon } = useClientStore()
  const { language, setLanguage } = useLanguageStore()
  const { token } = antTheme.useToken()
  const { t } = useTranslation()

  useEffect(() => {
    if (!user) {
      setShowUpgrade(false)
      return
    }
    if (isAdmin || !status?.valid) return
    const daysLeft = Number(status?.daysLeft ?? 999)
    if (daysLeft > 3) return
    const cacheKey = `gcom_upgrade_modal_${status?.vence_en || 'unknown'}`
    try {
      if (sessionStorage.getItem(cacheKey) === '1') return
      sessionStorage.setItem(cacheKey, '1')
    } catch {
      void 0
    }
    setShowUpgrade(true)
  }, [status, isAdmin, user])

  const menuItems = MENU_DEFS
    .filter(item => {
      if (item.type === 'divider') return true
      if (item.feature === '__admin__') return isAdmin
      return item.feature === null || features[item.feature]
    })
    .map(item => item.type === 'divider'
      ? { type: 'divider' }
      : { key: item.key, icon: item.icon, label: t(`nav.${item.navKey}`) }
    )

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: user?.nombre },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), danger: true }
    ],
    onClick: async ({ key }) => {
      if (key === 'logout') {
        try {
          await window.api?.cloudAuth?.signOut?.()
        } catch {
          void 0
        }
        await useClientStore.getState().load()
        logout()
        navigate('/login')
      }
    }
  }

  return (
    <>
      <MustChangeCloudPasswordModal />
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
          padding: '0 8px',
          overflow: 'hidden'
        }}>
          {collapsed ? (
            <img src={logoIcon || nexoIcon} alt="Nexo Commerce" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          ) : (
            <img src={logo || nexoLogo} alt="Nexo Commerce" style={{ width: '100%', height: 52, objectFit: 'contain' }} />
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

        {!collapsed && (
          <div style={{
            position: 'absolute', bottom: 12, left: 0, right: 0,
            textAlign: 'center', paddingTop: 10, paddingLeft: 12, paddingRight: 12,
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
              {t('nav.copyright')}
            </Text>
          </div>
        )}
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
            <Tooltip title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}>
              <Button
                type="text"
                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                style={{ fontWeight: 600, fontSize: 13, padding: '0 8px', minWidth: 40 }}
              >
                {language === 'es' ? 'EN' : 'ES'}
              </Button>
            </Tooltip>

            <Tooltip title={dark ? t('theme.switchToLight') : t('theme.switchToDark')}>
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

      <TrialUpgradeModal
        status={status}
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </Layout>
    </>
  )
}

export default MainLayout
