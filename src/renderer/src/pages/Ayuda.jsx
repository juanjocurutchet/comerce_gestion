import React, { useState } from 'react'
import {
  Typography, Card, Collapse, Tag, Space, Divider, Alert, Steps, Table
} from 'antd'
import {
  ShoppingCartOutlined, AppstoreOutlined, InboxOutlined,
  TeamOutlined, WalletOutlined, BarChartOutlined, UserOutlined,
  SettingOutlined, CloudUploadOutlined, FileTextOutlined,
  BarcodeOutlined, ScanOutlined, PrinterOutlined,
  PlusOutlined, DollarOutlined, CalendarOutlined,
  QuestionCircleOutlined, WarningOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

function Section({ icon, title, color = '#1677ff', children }) {
  return (
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
}

function Paso({ numero, texto }) {
  return (
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
}

function Tip({ children }) {
  return (
    <Alert
      type="info"
      showIcon
      style={{ marginTop: 12, marginBottom: 4 }}
      message={children}
    />
  )
}

export default function Ayuda() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <QuestionCircleOutlined style={{ marginRight: 10, color: '#1677ff' }} />
          Ayuda y manual de uso
        </Title>
        <Text type="secondary">
          Guía completa para el uso del sistema de gestión comercial.
        </Text>
      </div>

      {/* PRODUCTOS */}
      <Section icon={<AppstoreOutlined />} title="Productos" color="#1677ff">
        <Collapse ghost defaultActiveKey={[]}>
          <Panel header={<Text strong>Crear un producto nuevo</Text>} key="prod-nuevo">
            <Paso numero={1} texto='Ir al menú lateral → "Productos" → botón "Nuevo Producto".' />
            <Paso numero={2} texto='Completar el nombre del producto. El sistema sugiere productos existentes mientras escribís.' />
            <Paso numero={3} texto='Si el sistema detecta un producto similar, te preguntará si querés sumar stock al existente o crear uno nuevo.' />
            <Paso numero={4} texto='Completar precio de compra, precio de venta, categoría, proveedor, unidad y stock inicial.' />
            <Paso numero={5} texto='Hacer clic en "Guardar". El stock inicial queda registrado en el historial de movimientos.' />
            <Tip>El stock inicial solo se puede ingresar al crear el producto. Para agregar más stock después, usá el campo "Agregar stock" al editar.</Tip>
          </Panel>

          <Panel header={<Text strong><BarcodeOutlined /> Cargar código de barras con lector USB</Text>} key="prod-scan">
            <Alert
              type="success"
              showIcon
              icon={<ScanOutlined />}
              message="El lector USB se activa automáticamente al abrir el formulario de producto."
              style={{ marginBottom: 12 }}
            />
            <Paso numero={1} texto='Abrir el formulario de "Nuevo Producto" o "Editar Producto".' />
            <Paso numero={2} texto='Apuntar el lector al código de barras del producto y escanear.' />
            <Paso numero={3} texto='El código se completa automáticamente en el campo "Código de barras". El borde se pone verde como confirmación.' />
            <Paso numero={4} texto='Completar el resto de los campos normalmente.' />
            <Tip>Si el lector no responde, asegurate de que el formulario esté abierto y en foco. El lector funciona como un teclado — no hace falta ningún driver especial.</Tip>
          </Panel>

          <Panel header={<Text strong>Cargar código de barras manualmente</Text>} key="prod-manual">
            <Paso numero={1} texto='Abrir el formulario de producto.' />
            <Paso numero={2} texto='Hacer clic en el campo "Código de barras".' />
            <Paso numero={3} texto='Escribir el código manualmente y presionar Enter o Tab.' />
          </Panel>

          <Panel header={<Text strong>Editar un producto o sumar stock</Text>} key="prod-editar">
            <Paso numero={1} texto='En la lista de productos, hacer clic en el ícono de edición (lápiz) del producto.' />
            <Paso numero={2} texto='Modificar los campos que necesitás (precio, categoría, proveedor, etc.).' />
            <Paso numero={3} texto='Para sumar stock, usá el campo "Agregar stock" e ingresá la cantidad a sumar. Se suma al stock actual al guardar.' />
            <Paso numero={4} texto='Si el producto tiene vencimiento, al ingresar una cantidad en "Agregar stock" aparece el campo "Vencimiento de este lote" para registrar la fecha del nuevo lote.' />
            <Paso numero={5} texto='Hacer clic en "Guardar".' />
            <Tip>El campo "Stock Actual" está deshabilitado al editar — solo podés sumarlo usando "Agregar stock". Esto garantiza que el historial de movimientos quede registrado correctamente.</Tip>
          </Panel>

          <Panel header={<Text strong><CalendarOutlined /> Control de vencimiento de productos</Text>} key="prod-vencimiento">
            <Paragraph>
              Para productos perecederos (alimentos, medicamentos, cosméticos, etc.) podés configurar
              una fecha de vencimiento y un umbral de alerta por producto.
            </Paragraph>
            <Paso numero={1} texto='Al crear o editar un producto, completar el campo "Fecha de vencimiento" con la fecha del lote actual.' />
            <Paso numero={2} texto='Una vez ingresada la fecha, aparece el campo "Días de alerta previos" (por defecto 7 días). Define con cuántos días de anticipación querés que el sistema alerte sobre el vencimiento.' />
            <Paso numero={3} texto='Al guardar, el Dashboard mostrará este producto en el panel "Próximos a vencer" cuando la fecha se encuentre dentro del umbral configurado.' />
            <Paso numero={4} texto='La columna "Vencimiento" en la lista de productos muestra el estado con colores: gris (más de 30 días), naranja (≤ 30 días), rojo (≤ 7 días o ya vencido).' />
            <Tip>Si no cargás fecha de vencimiento, el campo se ignora. Esta funcionalidad es completamente opcional.</Tip>
          </Panel>

          <Panel header={<Text strong>Gestión de lotes con vencimiento diferente</Text>} key="prod-lotes">
            <Paragraph>
              Cuando recibís un nuevo lote del mismo producto con una fecha de vencimiento distinta,
              el sistema registra cada ingreso con su propia fecha y mantiene siempre la alerta
              sobre el lote más urgente.
            </Paragraph>
            <Paso numero={1} texto='Editar el producto y usar el campo "Agregar stock".' />
            <Paso numero={2} texto='Aparece el campo "Vencimiento de este lote" — ingresá la fecha del nuevo lote.' />
            <Paso numero={3} texto='Al guardar, el sistema actualiza automáticamente la fecha del producto a la del lote que vence primero.' />
            <Alert
              type="info" showIcon style={{ marginTop: 12 }}
              message='Ejemplo: tenés leche con lote A (vence 15/04) y llega el lote B (vence 30/04). El sistema guarda ambos en el historial y mantiene la alerta en 15/04. Al agotarse el lote A, el próximo ingreso actualizará la alerta a 30/04.'
            />
          </Panel>

          <Panel header={<Text strong>Eliminar un producto</Text>} key="prod-eliminar">
            <Paso numero={1} texto='En la lista, hacer clic en el ícono de eliminación (papelera roja) del producto.' />
            <Paso numero={2} texto='Confirmar la acción en el diálogo que aparece.' />
            <Alert type="warning" showIcon message="Eliminar un producto es una acción irreversible." style={{ marginTop: 8 }} />
          </Panel>
        </Collapse>
      </Section>

      {/* VENTAS */}
      <Section icon={<ShoppingCartOutlined />} title="Ventas" color="#52c41a">
        <Collapse ghost>
          <Panel header={<Text strong>Realizar una venta</Text>} key="venta-nueva">
            <Paso numero={1} texto='Ir al menú → "Ventas".' />
            <Paso numero={2} texto='Buscar el producto por nombre, código o escanear el código de barras con el lector USB.' />
            <Paso numero={3} texto='El producto se agrega al carrito. Podés ajustar la cantidad directamente en el carrito.' />
            <Paso numero={4} texto='Si querés aplicar un descuento, ingresalo en el campo correspondiente (monto fijo o porcentaje).' />
            <Paso numero={5} texto='Seleccionar el método de pago: efectivo, tarjeta, transferencia, Mercado Pago, etc.' />
            <Paso numero={6} texto='Confirmar la venta. El sistema descuenta el stock automáticamente.' />
          </Panel>

          <Panel header={<Text strong><DollarOutlined /> Calcular vuelto en efectivo</Text>} key="venta-vuelto">
            <Paso numero={1} texto='Seleccionar "Efectivo" como método de pago.' />
            <Paso numero={2} texto='Aparece el campo "Monto recibido" debajo del método de pago.' />
            <Paso numero={3} texto='Ingresar el monto entregado por el cliente.' />
            <Paso numero={4} texto='El sistema muestra el vuelto en tiempo real: verde si el monto alcanza, rojo si es insuficiente.' />
            <Tip>El campo de vuelto es solo informativo para el vendedor — no afecta el registro de la venta.</Tip>
          </Panel>

          <Panel header={<Text strong><WarningOutlined /> Productos con vencimiento próximo en la venta</Text>} key="venta-venc">
            <Paragraph>
              Si un producto tiene fecha de vencimiento cargada y está próximo a vencer o ya venció,
              el sistema muestra una advertencia en la lista de productos del punto de venta.
            </Paragraph>
            <Alert type="warning" showIcon style={{ marginTop: 8 }}
              message='Si agregás al carrito un producto ya vencido, el sistema muestra un aviso pero no bloquea la venta. Decidís vos si continuar (por ejemplo, con un descuento).'
            />
          </Panel>

          <Panel header={<Text strong><BarcodeOutlined /> Escanear productos en la venta</Text>} key="venta-scan">
            <Paso numero={1} texto='Con la pantalla de Ventas abierta, escanear el código de barras del producto.' />
            <Paso numero={2} texto='Si el producto está cargado en el sistema, se agrega automáticamente al carrito.' />
            <Paso numero={3} texto='Escanear el mismo código nuevamente suma una unidad más.' />
            <Tip>El lector USB funciona directamente en la pantalla de ventas sin necesidad de hacer clic en ningún campo primero.</Tip>
          </Panel>

          <Panel header={<Text strong><PrinterOutlined /> Imprimir ticket o comprobante</Text>} key="venta-ticket">
            <Paso numero={1} texto='Al finalizar la venta, el sistema ofrece imprimir el comprobante.' />
            <Paso numero={2} texto='El ticket incluye: datos del comercio, detalle de productos, subtotal, descuento, total y método de pago.' />
            <Tip>Los datos del comercio (nombre, dirección, teléfono, mensaje de pie de página) se configuran en Configuración → datos del ticket.</Tip>
          </Panel>
        </Collapse>
      </Section>

      {/* COTIZACIONES */}
      <Section icon={<FileTextOutlined />} title="Cotizaciones" color="#722ed1">
        <Collapse ghost>
          <Panel header={<Text strong>Crear un presupuesto</Text>} key="cot-nueva">
            <Paso numero={1} texto='Ir al menú → "Cotizaciones" → "Nueva Cotización".' />
            <Paso numero={2} texto='Agregar el nombre del cliente (opcional).' />
            <Paso numero={3} texto='Buscar y agregar los productos igual que en una venta.' />
            <Paso numero={4} texto='Podés aplicar descuentos por ítem o sobre el total.' />
            <Paso numero={5} texto='Guardar la cotización. No descuenta stock.' />
          </Panel>
          <Panel header={<Text strong>Convertir una cotización en venta</Text>} key="cot-convertir">
            <Paso numero={1} texto='Abrir la cotización desde la lista.' />
            <Paso numero={2} texto='Hacer clic en "Convertir a Venta".' />
            <Paso numero={3} texto='Confirmar el método de pago y finalizar.' />
            <Tip>Al convertir una cotización en venta, el stock se descuenta y la cotización queda marcada como "Vendida".</Tip>
          </Panel>
        </Collapse>
      </Section>

      {/* STOCK */}
      <Section icon={<InboxOutlined />} title="Stock e inventario" color="#fa8c16">
        <Collapse ghost>
          <Panel header={<Text strong>Ver el estado del stock</Text>} key="stock-ver">
            <Paso numero={1} texto='Ir al menú → "Stock".' />
            <Paso numero={2} texto='La tabla muestra todos los productos con su stock actual, mínimo y estado.' />
            <Paso numero={3} texto='Los productos en rojo tienen stock en 0. Los en naranja están por debajo del mínimo configurado.' />
          </Panel>
          <Panel header={<Text strong>Ingreso de stock con lote de vencimiento</Text>} key="stock-lote">
            <Paso numero={1} texto='Ir al menú → "Stock" → botón "Ingreso".' />
            <Paso numero={2} texto='Seleccionar el producto, ingresar la cantidad y el motivo.' />
            <Paso numero={3} texto='Si el lote tiene fecha de vencimiento, completar el campo "Vencimiento de este lote".' />
            <Paso numero={4} texto='Confirmar. El movimiento queda registrado con la fecha del lote.' />
            <Tip>Al ingresar un lote con vencimiento, el producto actualiza automáticamente su alerta a la fecha más urgente entre todos los lotes registrados.</Tip>
          </Panel>

          <Panel header={<Text strong>Historial de movimientos</Text>} key="stock-historial">
            <Paragraph>
              Cada ingreso, egreso, ajuste o venta queda registrado en el historial con: fecha, usuario, motivo y
              — cuando aplica — la fecha de vencimiento del lote ingresado.
              La columna "Vencimiento lote" en el historial muestra con colores si el lote está vencido (rojo),
              por vencer pronto (naranja) o vigente (gris).
            </Paragraph>
          </Panel>

          <Panel header={<Text strong>Alertas de stock bajo</Text>} key="stock-alertas">
            <Paragraph>
              En el <strong>Dashboard</strong>, el panel "Stock Bajo" muestra los productos con stock igual o menor
              al mínimo configurado. Haciendo clic en el panel o en "Ver todos" se abre el listado completo
              con el stock actual y el mínimo de cada producto.
            </Paragraph>
          </Panel>
        </Collapse>
      </Section>

      {/* CAJA */}
      <Section icon={<WalletOutlined />} title="Caja" color="#eb2f96">
        <Collapse ghost>
          <Panel header={<Text strong>Apertura de caja</Text>} key="caja-apertura">
            <Paso numero={1} texto='Ir al menú → "Caja".' />
            <Paso numero={2} texto='Si no hay una caja abierta, hacer clic en "Abrir Caja".' />
            <Paso numero={3} texto='Ingresar el monto de apertura (efectivo en caja al inicio del día).' />
            <Paso numero={4} texto='Confirmar. A partir de ese momento las ventas en efectivo quedan registradas en esta caja.' />
          </Panel>
          <Panel header={<Text strong>Cierre de caja</Text>} key="caja-cierre">
            <Paso numero={1} texto='Ir al menú → "Caja" con la caja abierta.' />
            <Paso numero={2} texto='Hacer clic en "Cerrar Caja".' />
            <Paso numero={3} texto='El sistema muestra el resumen: monto de apertura, ventas en efectivo, total esperado.' />
            <Paso numero={4} texto='Ingresar el monto real contado y confirmar el cierre.' />
            <Tip>La diferencia entre el monto esperado y el contado queda registrada en el historial de cierres de caja.</Tip>
          </Panel>
        </Collapse>
      </Section>

      {/* PROVEEDORES */}
      <Section icon={<TeamOutlined />} title="Proveedores" color="#13c2c2">
        <Collapse ghost>
          <Panel header={<Text strong>Gestionar proveedores</Text>} key="prov-gestionar">
            <Paso numero={1} texto='Ir al menú → "Proveedores" → "Nuevo Proveedor".' />
            <Paso numero={2} texto='Completar nombre, contacto, teléfono, email y dirección.' />
            <Paso numero={3} texto='Guardar. Los proveedores quedan disponibles para asignarlos a los productos.' />
            <Tip>Al asignar un proveedor a un producto podés filtrar y ordenar el catálogo por proveedor fácilmente.</Tip>
          </Panel>
        </Collapse>
      </Section>

      {/* REPORTES */}
      <Section icon={<BarChartOutlined />} title="Reportes" color="#fa541c">
        <Collapse ghost>
          <Panel header={<Text strong>Ver reportes de ventas</Text>} key="rep-ventas">
            <Paso numero={1} texto='Ir al menú → "Reportes".' />
            <Paso numero={2} texto='Seleccionar el rango de fechas que querés analizar.' />
            <Paso numero={3} texto='El sistema muestra: total de ventas, cantidad de transacciones, productos más vendidos y evolución diaria.' />
          </Panel>
          <Panel header={<Text strong>Dashboard de resumen diario</Text>} key="rep-dashboard">
            <Paragraph>
              El <strong>Dashboard</strong> (pantalla principal) muestra:
            </Paragraph>
            <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
              <li>Ventas del día y monto recaudado</li>
              <li>Total de productos activos</li>
              <li>Cantidad de productos con stock bajo (clickeable → abre el listado completo)</li>
              <li>Gráfico de ventas de los últimos 7 días</li>
              <li>Panel <strong>Stock Bajo</strong>: lista los productos con stock en alerta. Clic en "Ver todos" para el detalle.</li>
              <li>Panel <strong>Próximos a vencer</strong>: muestra productos cuya fecha de vencimiento está dentro del umbral de alerta configurado. Clic en "Ver todos" para el detalle completo con fechas exactas.</li>
            </ul>
            <Tip>El panel "Próximos a vencer" solo aparece cuando hay productos con fecha de vencimiento cargada. Si ningún producto tiene vencimiento configurado, el panel muestra "Sin alertas de vencimiento".</Tip>
          </Panel>
        </Collapse>
      </Section>

      {/* USUARIOS */}
      <Section icon={<UserOutlined />} title="Usuarios" color="#597ef7">
        <Collapse ghost>
          <Panel header={<Text strong>Crear un usuario</Text>} key="usr-crear">
            <Paso numero={1} texto='Ir al menú → "Usuarios" → "Nuevo Usuario".' />
            <Paso numero={2} texto='Completar nombre, usuario (para login) y contraseña.' />
            <Paso numero={3} texto='Asignar el rol: Administrador o Vendedor.' />
            <Paso numero={4} texto='Guardar.' />
          </Panel>
          <Panel header={<Text strong>Roles y permisos</Text>} key="usr-roles">
            <Table
              size="small"
              pagination={false}
              dataSource={[
                { key: 1, accion: 'Realizar ventas', admin: '✓', vendedor: '✓' },
                { key: 2, accion: 'Crear/editar productos', admin: '✓', vendedor: '✓' },
                { key: 3, accion: 'Ver reportes', admin: '✓', vendedor: '—' },
                { key: 4, accion: 'Gestionar usuarios', admin: '✓', vendedor: '—' },
                { key: 5, accion: 'Configuración del sistema', admin: '✓', vendedor: '—' },
                { key: 6, accion: 'Backup y restauración', admin: '✓', vendedor: '—' },
              ]}
              columns={[
                { title: 'Acción', dataIndex: 'accion' },
                { title: 'Administrador', dataIndex: 'admin', align: 'center', width: 140 },
                { title: 'Vendedor', dataIndex: 'vendedor', align: 'center', width: 120 },
              ]}
            />
          </Panel>
        </Collapse>
      </Section>

      {/* CONFIGURACION */}
      <Section icon={<SettingOutlined />} title="Configuración" color="#8c8c8c">
        <Collapse ghost>
          <Panel header={<Text strong>Datos del comercio y ticket</Text>} key="cfg-ticket">
            <Paso numero={1} texto='Ir al menú → "Configuración".' />
            <Paso numero={2} texto='Completar: nombre del comercio, dirección, teléfono, CUIT y mensaje de pie de ticket.' />
            <Paso numero={3} texto='Estos datos aparecen en todos los tickets y comprobantes impresos.' />
            <Paso numero={4} texto='Guardar los cambios.' />
          </Panel>

          <Panel header={<Text strong><AppstoreOutlined /> Gestión de categorías</Text>} key="cfg-categorias">
            <Paragraph>
              Las categorías de productos se administran directamente desde Configuración,
              en la columna derecha de la pantalla.
            </Paragraph>
            <Paso numero={1} texto='Ir al menú → "Configuración".' />
            <Paso numero={2} texto='En la sección "Categorías de Productos" hacer clic en "Nueva Categoría".' />
            <Paso numero={3} texto='Ingresar el nombre y una descripción opcional.' />
            <Paso numero={4} texto='Guardar. La categoría queda disponible inmediatamente en el formulario de productos.' />
            <Alert type="info" showIcon style={{ marginTop: 12 }}
              message='Para eliminar una categoría, primero hay que reasignar o eliminar los productos que la usan. El sistema no permite borrar una categoría con productos asociados.'
            />
          </Panel>
        </Collapse>
      </Section>

      {/* BACKUP */}
      <Section icon={<CloudUploadOutlined />} title="Backup y restauración" color="#389e0d">
        <Collapse ghost>
          <Panel header={<Text strong>Hacer una copia de seguridad</Text>} key="bkp-hacer">
            <Paso numero={1} texto='Ir al menú → "Backup".' />
            <Paso numero={2} texto='Hacer clic en "Crear Backup".' />
            <Paso numero={3} texto='Seleccionar la carpeta donde guardar el archivo.' />
            <Paso numero={4} texto='El archivo .db generado contiene toda la información de la base de datos.' />
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message="Recomendamos hacer un backup diario y guardarlo en un lugar externo (pendrive, Google Drive, etc.)."
            />
          </Panel>
          <Panel header={<Text strong>Restaurar desde un backup</Text>} key="bkp-restaurar">
            <Paso numero={1} texto='Ir al menú → "Backup".' />
            <Paso numero={2} texto='Hacer clic en "Restaurar Backup".' />
            <Paso numero={3} texto='Seleccionar el archivo .db del backup.' />
            <Paso numero={4} texto='Confirmar. La aplicación se reinicia con los datos restaurados.' />
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12 }}
              message="Restaurar un backup reemplaza todos los datos actuales. Esta acción no se puede deshacer."
            />
          </Panel>
        </Collapse>
      </Section>

      <Card style={{ marginBottom: 16 }}>
        <Space align="start">
          <QuestionCircleOutlined style={{ fontSize: 20, color: '#1677ff', marginTop: 2 }} />
          <Space direction="vertical" size={2}>
            <Text strong>¿Necesitás más ayuda?</Text>
            <Text type="secondary">
              Contactá a soporte técnico:{' '}
              <Text copyable style={{ color: '#1677ff' }}>soporteshangotech@gmail.com</Text>
            </Text>
          </Space>
        </Space>
      </Card>
    </div>
  )
}
