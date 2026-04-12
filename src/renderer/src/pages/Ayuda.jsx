import React from 'react'
import {
  Typography, Collapse, Alert, Table
} from 'antd'
import {
  ShoppingCartOutlined, AppstoreOutlined, InboxOutlined,
  TeamOutlined, WalletOutlined, BarChartOutlined, UserOutlined,
  SettingOutlined, CloudUploadOutlined, FileTextOutlined,
  BarcodeOutlined, ScanOutlined, PrinterOutlined,
  DollarOutlined, CalendarOutlined,
  QuestionCircleOutlined, WarningOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Section, Paso, Tip } from '../components/AyudaHelpers'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

const Ayuda = () => {
  const { t } = useTranslation()
  const s = (key) => t(`ayuda.sections.${key}`)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <QuestionCircleOutlined style={{ marginRight: 10, color: '#1677ff' }} />
          {t('ayuda.title')}
        </Title>
        <Text type="secondary">{t('ayuda.subtitle')}</Text>
      </div>

      <Section icon={<AppstoreOutlined />} title={s('productos.title')} color="#1677ff">
        <Collapse ghost defaultActiveKey={[]}>
          <Panel header={<Text strong>{s('productos.panelNew')}</Text>} key="prod-nuevo">
            <Paso numero={1} texto={s('productos.step1New')} />
            <Paso numero={2} texto={s('productos.step2New')} />
            <Paso numero={3} texto={s('productos.step3New')} />
            <Paso numero={4} texto={s('productos.step4New')} />
            <Paso numero={5} texto={s('productos.step5New')} />
            <Tip>{s('productos.tipNew')}</Tip>
          </Panel>

          <Panel header={<Text strong><BarcodeOutlined /> {s('productos.panelScan')}</Text>} key="prod-scan">
            <Alert
              type="success"
              showIcon
              icon={<ScanOutlined />}
              message={s('productos.scanAlert')}
              style={{ marginBottom: 12 }}
            />
            <Paso numero={1} texto={s('productos.step1Scan')} />
            <Paso numero={2} texto={s('productos.step2Scan')} />
            <Paso numero={3} texto={s('productos.step3Scan')} />
            <Paso numero={4} texto={s('productos.step4Scan')} />
            <Tip>{s('productos.tipScan')}</Tip>
          </Panel>

          <Panel header={<Text strong>{s('productos.panelManual')}</Text>} key="prod-manual">
            <Paso numero={1} texto={s('productos.step1Manual')} />
            <Paso numero={2} texto={s('productos.step2Manual')} />
            <Paso numero={3} texto={s('productos.step3Manual')} />
          </Panel>

          <Panel header={<Text strong>{s('productos.panelEdit')}</Text>} key="prod-editar">
            <Paso numero={1} texto={s('productos.step1Edit')} />
            <Paso numero={2} texto={s('productos.step2Edit')} />
            <Paso numero={3} texto={s('productos.step3Edit')} />
            <Paso numero={4} texto={s('productos.step4Edit')} />
            <Paso numero={5} texto={s('productos.step5Edit')} />
            <Tip>{s('productos.tipEdit')}</Tip>
          </Panel>

          <Panel header={<Text strong><CalendarOutlined /> {s('productos.panelExpiry')}</Text>} key="prod-vencimiento">
            <Paragraph>{s('productos.expiryIntro')}</Paragraph>
            <Paso numero={1} texto={s('productos.step1Expiry')} />
            <Paso numero={2} texto={s('productos.step2Expiry')} />
            <Paso numero={3} texto={s('productos.step3Expiry')} />
            <Paso numero={4} texto={s('productos.step4Expiry')} />
            <Tip>{s('productos.tipExpiry')}</Tip>
          </Panel>

          <Panel header={<Text strong>{s('productos.panelLots')}</Text>} key="prod-lotes">
            <Paragraph>{s('productos.lotsIntro')}</Paragraph>
            <Paso numero={1} texto={s('productos.step1Lots')} />
            <Paso numero={2} texto={s('productos.step2Lots')} />
            <Paso numero={3} texto={s('productos.step3Lots')} />
            <Alert type="info" showIcon style={{ marginTop: 12 }} message={s('productos.lotsExample')} />
          </Panel>

          <Panel header={<Text strong>{s('productos.panelDelete')}</Text>} key="prod-eliminar">
            <Paso numero={1} texto={s('productos.step1Delete')} />
            <Paso numero={2} texto={s('productos.step2Delete')} />
            <Alert type="warning" showIcon message={s('productos.deleteWarning')} style={{ marginTop: 8 }} />
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<ShoppingCartOutlined />} title={s('ventas.title')} color="#52c41a">
        <Collapse ghost>
          <Panel header={<Text strong>{s('ventas.panelNew')}</Text>} key="venta-nueva">
            <Paso numero={1} texto={s('ventas.step1')} />
            <Paso numero={2} texto={s('ventas.step2')} />
            <Paso numero={3} texto={s('ventas.step3')} />
            <Paso numero={4} texto={s('ventas.step4')} />
            <Paso numero={5} texto={s('ventas.step5')} />
            <Paso numero={6} texto={s('ventas.step6')} />
          </Panel>

          <Panel header={<Text strong><DollarOutlined /> {s('ventas.panelChange')}</Text>} key="venta-vuelto">
            <Paso numero={1} texto={s('ventas.step1Change')} />
            <Paso numero={2} texto={s('ventas.step2Change')} />
            <Paso numero={3} texto={s('ventas.step3Change')} />
            <Paso numero={4} texto={s('ventas.step4Change')} />
            <Tip>{s('ventas.tipChange')}</Tip>
          </Panel>

          <Panel header={<Text strong><WarningOutlined /> {s('ventas.panelExpiry')}</Text>} key="venta-venc">
            <Paragraph>{s('ventas.expiryText')}</Paragraph>
            <Alert type="warning" showIcon style={{ marginTop: 8 }} message={s('ventas.expiryAlert')} />
          </Panel>

          <Panel header={<Text strong><BarcodeOutlined /> {s('ventas.panelScan')}</Text>} key="venta-scan">
            <Paso numero={1} texto={s('ventas.step1Scan')} />
            <Paso numero={2} texto={s('ventas.step2Scan')} />
            <Paso numero={3} texto={s('ventas.step3Scan')} />
            <Tip>{s('ventas.tipScan')}</Tip>
          </Panel>

          <Panel header={<Text strong><PrinterOutlined /> {s('ventas.panelTicket')}</Text>} key="venta-ticket">
            <Paso numero={1} texto={s('ventas.step1Ticket')} />
            <Paso numero={2} texto={s('ventas.step2Ticket')} />
            <Tip>{s('ventas.tipTicket')}</Tip>
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<FileTextOutlined />} title={s('cotizaciones.title')} color="#722ed1">
        <Collapse ghost>
          <Panel header={<Text strong>{s('cotizaciones.panelNew')}</Text>} key="cot-nueva">
            <Paso numero={1} texto={s('cotizaciones.step1')} />
            <Paso numero={2} texto={s('cotizaciones.step2')} />
            <Paso numero={3} texto={s('cotizaciones.step3')} />
            <Paso numero={4} texto={s('cotizaciones.step4')} />
            <Paso numero={5} texto={s('cotizaciones.step5')} />
          </Panel>
          <Panel header={<Text strong>{s('cotizaciones.panelConvert')}</Text>} key="cot-convertir">
            <Paso numero={1} texto={s('cotizaciones.step1Convert')} />
            <Paso numero={2} texto={s('cotizaciones.step2Convert')} />
            <Paso numero={3} texto={s('cotizaciones.step3Convert')} />
            <Tip>{s('cotizaciones.tipConvert')}</Tip>
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<InboxOutlined />} title={s('stock.title')} color="#fa8c16">
        <Collapse ghost>
          <Panel header={<Text strong>{s('stock.panelView')}</Text>} key="stock-ver">
            <Paso numero={1} texto={s('stock.step1View')} />
            <Paso numero={2} texto={s('stock.step2View')} />
            <Paso numero={3} texto={s('stock.step3View')} />
          </Panel>
          <Panel header={<Text strong>{s('stock.panelLot')}</Text>} key="stock-lote">
            <Paso numero={1} texto={s('stock.step1Lot')} />
            <Paso numero={2} texto={s('stock.step2Lot')} />
            <Paso numero={3} texto={s('stock.step3Lot')} />
            <Paso numero={4} texto={s('stock.step4Lot')} />
            <Tip>{s('stock.tipLot')}</Tip>
          </Panel>
          <Panel header={<Text strong>{s('stock.panelHistory')}</Text>} key="stock-historial">
            <Paragraph>{s('stock.historyText')}</Paragraph>
          </Panel>
          <Panel header={<Text strong>{s('stock.panelAlerts')}</Text>} key="stock-alertas">
            <Paragraph>{s('stock.alertsText')}</Paragraph>
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<WalletOutlined />} title={s('caja.title')} color="#eb2f96">
        <Collapse ghost>
          <Panel header={<Text strong>{s('caja.panelOpen')}</Text>} key="caja-apertura">
            <Paso numero={1} texto={s('caja.step1Open')} />
            <Paso numero={2} texto={s('caja.step2Open')} />
            <Paso numero={3} texto={s('caja.step3Open')} />
            <Paso numero={4} texto={s('caja.step4Open')} />
          </Panel>
          <Panel header={<Text strong>{s('caja.panelClose')}</Text>} key="caja-cierre">
            <Paso numero={1} texto={s('caja.step1Close')} />
            <Paso numero={2} texto={s('caja.step2Close')} />
            <Paso numero={3} texto={s('caja.step3Close')} />
            <Paso numero={4} texto={s('caja.step4Close')} />
            <Tip>{s('caja.tipClose')}</Tip>
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<TeamOutlined />} title={s('proveedores.title')} color="#13c2c2">
        <Collapse ghost>
          <Panel header={<Text strong>{s('proveedores.panelManage')}</Text>} key="prov-gestionar">
            <Paso numero={1} texto={s('proveedores.step1')} />
            <Paso numero={2} texto={s('proveedores.step2')} />
            <Paso numero={3} texto={s('proveedores.step3')} />
            <Tip>{s('proveedores.tip')}</Tip>
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<BarChartOutlined />} title={s('reportes.title')} color="#fa541c">
        <Collapse ghost>
          <Panel header={<Text strong>{s('reportes.panelSales')}</Text>} key="rep-ventas">
            <Paso numero={1} texto={s('reportes.step1')} />
            <Paso numero={2} texto={s('reportes.step2')} />
            <Paso numero={3} texto={s('reportes.step3')} />
          </Panel>
          <Panel header={<Text strong>{s('reportes.panelDashboard')}</Text>} key="rep-dashboard">
            <Paragraph>{s('reportes.dashboardText')}</Paragraph>
            <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
              <li>{s('reportes.item1')}</li>
              <li>{s('reportes.item2')}</li>
              <li>{s('reportes.item3')}</li>
              <li>{s('reportes.item4')}</li>
              <li>{s('reportes.item5')}</li>
              <li>{s('reportes.item6')}</li>
            </ul>
            <Tip>{s('reportes.tipDashboard')}</Tip>
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<UserOutlined />} title={s('usuarios.title')} color="#597ef7">
        <Collapse ghost>
          <Panel header={<Text strong>{s('usuarios.panelCreate')}</Text>} key="usr-crear">
            <Paso numero={1} texto={s('usuarios.step1')} />
            <Paso numero={2} texto={s('usuarios.step2')} />
            <Paso numero={3} texto={s('usuarios.step3')} />
            <Paso numero={4} texto={s('usuarios.step4')} />
          </Panel>
          <Panel header={<Text strong>{s('usuarios.panelRoles')}</Text>} key="usr-roles">
            <Table
              size="small"
              pagination={false}
              dataSource={[
                { key: 1, accion: s('usuarios.actionSales'),    admin: '✓', vendedor: '✓' },
                { key: 2, accion: s('usuarios.actionProducts'), admin: '✓', vendedor: '✓' },
                { key: 3, accion: s('usuarios.actionReports'),  admin: '✓', vendedor: '—' },
                { key: 4, accion: s('usuarios.actionUsers'),    admin: '✓', vendedor: '—' },
                { key: 5, accion: s('usuarios.actionConfig'),   admin: '✓', vendedor: '—' },
                { key: 6, accion: s('usuarios.actionBackup'),   admin: '✓', vendedor: '—' },
              ]}
              columns={[
                { title: s('usuarios.colAction'), dataIndex: 'accion' },
                { title: s('usuarios.colAdmin'),  dataIndex: 'admin',    align: 'center', width: 140 },
                { title: s('usuarios.colSeller'), dataIndex: 'vendedor', align: 'center', width: 120 },
              ]}
            />
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<SettingOutlined />} title={s('configuracion.title')} color="#8c8c8c">
        <Collapse ghost>
          <Panel header={<Text strong>{s('configuracion.panelTicket')}</Text>} key="cfg-ticket">
            <Paso numero={1} texto={s('configuracion.step1')} />
            <Paso numero={2} texto={s('configuracion.step2')} />
            <Paso numero={3} texto={s('configuracion.step3')} />
            <Paso numero={4} texto={s('configuracion.step4')} />
          </Panel>
          <Panel header={<Text strong><AppstoreOutlined /> {s('configuracion.panelCategories')}</Text>} key="cfg-categorias">
            <Paragraph>{s('configuracion.categoriesText')}</Paragraph>
            <Paso numero={1} texto={s('configuracion.step1Cat')} />
            <Paso numero={2} texto={s('configuracion.step2Cat')} />
            <Paso numero={3} texto={s('configuracion.step3Cat')} />
            <Paso numero={4} texto={s('configuracion.step4Cat')} />
            <Alert type="info" showIcon style={{ marginTop: 12 }} message={s('configuracion.catAlert')} />
          </Panel>
        </Collapse>
      </Section>

      <Section icon={<CloudUploadOutlined />} title={s('backup.title')} color="#389e0d">
        <Collapse ghost>
          <Panel header={<Text strong>{s('backup.panelCreate')}</Text>} key="bkp-hacer">
            <Paso numero={1} texto={s('backup.step1')} />
            <Paso numero={2} texto={s('backup.step2')} />
            <Paso numero={3} texto={s('backup.step3')} />
            <Paso numero={4} texto={s('backup.step4')} />
            <Alert type="warning" showIcon style={{ marginTop: 12 }} message={s('backup.backupWarning')} />
          </Panel>
          <Panel header={<Text strong>{s('backup.panelRestore')}</Text>} key="bkp-restaurar">
            <Paso numero={1} texto={s('backup.step1Restore')} />
            <Paso numero={2} texto={s('backup.step2Restore')} />
            <Paso numero={3} texto={s('backup.step3Restore')} />
            <Paso numero={4} texto={s('backup.step4Restore')} />
            <Alert type="error" showIcon style={{ marginTop: 12 }} message={s('backup.restoreError')} />
          </Panel>
        </Collapse>
      </Section>

      <Card style={{ marginBottom: 16 }}>
        <Space align="start">
          <QuestionCircleOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 2 }} />
          <Space direction="vertical" size={2}>
            <Text strong>{t('ayuda.supportTitle')}</Text>
            <Text type="secondary">
              {t('ayuda.supportText')}{' '}
              <Text copyable style={{ color: '#1677ff' }}>soporteshangotech@gmail.com</Text>
            </Text>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

export default Ayuda
