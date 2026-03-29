import dayjs from 'dayjs'

/**
 * Genera el HTML del ticket de venta.
 * Diseñado para impresoras térmicas de 80mm y también A4.
 */
export function generateReceiptHTML(venta, items, config = {}) {
  const {
    nombreComercio = 'Mi Comercio',
    direccion = '',
    telefono = '',
    cuit = '',
    footer = 'Gracias por su compra!'
  } = config

  const fecha = dayjs(venta.fecha).format('DD/MM/YYYY HH:mm')

  const itemsHTML = items.map(item => `
    <tr>
      <td class="item-name">${item.producto_nombre || item.nombre}</td>
      <td class="item-qty">${item.cantidad}</td>
      <td class="item-price">$${Number(item.precio_unitario).toFixed(2)}</td>
      <td class="item-sub">$${Number(item.subtotal).toFixed(2)}</td>
    </tr>
  `).join('')

  const metodoPagoLabel = {
    efectivo: 'Efectivo',
    tarjeta_debito: 'Tarjeta Débito',
    tarjeta_credito: 'Tarjeta Crédito',
    transferencia: 'Transferencia',
    otro: 'Otro'
  }[venta.metodo_pago] || venta.metodo_pago

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket #${venta.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 80mm;
      padding: 4mm 4mm;
    }

    .header {
      text-align: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px dashed #000;
    }
    .header .comercio {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .info {
      font-size: 11px;
      margin-top: 2px;
      line-height: 1.4;
    }

    .ticket-info {
      margin: 6px 0;
      padding-bottom: 6px;
      border-bottom: 1px dashed #000;
      font-size: 11px;
      line-height: 1.6;
    }
    .ticket-info .row {
      display: flex;
      justify-content: space-between;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
    }
    thead th {
      font-size: 10px;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding: 2px 2px;
      text-align: left;
    }
    thead th.right { text-align: right; }

    td {
      padding: 3px 2px;
      font-size: 11px;
      vertical-align: top;
    }
    .item-name { max-width: 30mm; word-wrap: break-word; }
    .item-qty  { text-align: center; width: 8mm; }
    .item-price { text-align: right; width: 16mm; }
    .item-sub  { text-align: right; width: 16mm; font-weight: bold; }

    .divider {
      border: none;
      border-top: 1px dashed #000;
      margin: 4px 0;
    }

    .totals {
      margin-top: 4px;
      font-size: 12px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .totals .total-row {
      font-size: 15px;
      font-weight: bold;
      border-top: 1px solid #000;
      padding-top: 4px;
      margin-top: 2px;
    }

    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 11px;
      border-top: 1px dashed #000;
      padding-top: 6px;
      line-height: 1.5;
    }

    @media print {
      body { width: 80mm; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="comercio">${nombreComercio}</div>
    <div class="info">
      ${direccion ? `<div>${direccion}</div>` : ''}
      ${telefono ? `<div>Tel: ${telefono}</div>` : ''}
      ${cuit ? `<div>CUIT: ${cuit}</div>` : ''}
    </div>
  </div>

  <div class="ticket-info">
    <div class="row"><span>Ticket N°:</span><span><b>#${String(venta.id).padStart(6, '0')}</b></span></div>
    <div class="row"><span>Fecha:</span><span>${fecha}</span></div>
    ${venta.usuario_nombre ? `<div class="row"><span>Vendedor:</span><span>${venta.usuario_nombre}</span></div>` : ''}
    <div class="row"><span>Pago:</span><span>${metodoPagoLabel}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align:center">Cant</th>
        <th class="right">P.Unit</th>
        <th class="right">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <hr class="divider">

  <div class="totals">
    <div class="row"><span>Subtotal:</span><span>$${Number(venta.subtotal).toFixed(2)}</span></div>
    ${Number(venta.descuento) > 0
      ? `<div class="row"><span>Descuento:</span><span>-$${Number(venta.descuento).toFixed(2)}</span></div>`
      : ''
    }
    <div class="row total-row"><span>TOTAL:</span><span>$${Number(venta.total).toFixed(2)}</span></div>
  </div>

  ${venta.notas ? `<div style="margin-top:6px;font-size:11px;"><b>Nota:</b> ${venta.notas}</div>` : ''}

  <div class="footer">
    <div>${footer}</div>
    <div style="margin-top:4px; font-size:10px;">${dayjs().format('DD/MM/YYYY HH:mm:ss')}</div>
  </div>
</body>
</html>`
}
