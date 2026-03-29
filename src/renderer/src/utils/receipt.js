import dayjs from 'dayjs'

/**
 * Despacha al generador correcto según el tamaño de página.
 */
export function generateReceiptHTML(venta, items, config = {}, pageSize = '80mm') {
  if (pageSize === 'A4' || pageSize === 'A5') {
    return generateInvoiceHTML(venta, items, config, pageSize)
  }
  return generateTicketHTML(venta, items, config)
}

/**
 * Comprobante de venta tipo "Remito X" para A4 / A5.
 */
export function generateInvoiceHTML(venta, items, config = {}, pageSize = 'A4') {
  const {
    nombreComercio = 'Mi Comercio',
    direccion = '',
    telefono = '',
    cuit = '',
    ticketFooter = 'Gracias por su compra!'
  } = config

  const fecha     = dayjs(venta.fecha).format('DD/MM/YYYY')
  const hora      = dayjs(venta.fecha).format('HH:mm')
  const numero    = String(venta.id).padStart(8, '0')
  const isA5      = pageSize === 'A5'
  const baseFontSize = isA5 ? '11px' : '13px'

  const metodoPagoLabel = {
    efectivo: 'Efectivo',
    tarjeta_debito: 'Tarjeta Débito',
    tarjeta_credito: 'Tarjeta Crédito',
    transferencia: 'Transferencia',
    otro: 'Otro'
  }[venta.metodo_pago] || venta.metodo_pago || '-'

  const itemsHTML = items.map((item, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : ''}">
      <td class="td-center">${i + 1}</td>
      <td class="td-center">${item.cantidad}</td>
      <td>${item.producto_nombre || item.nombre}</td>
      <td class="td-right">$${Number(item.precio_unitario).toFixed(2)}</td>
      <td class="td-right">$${Number(item.subtotal).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante #${numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${baseFontSize};
      color: #111;
      background: #fff;
      padding: ${isA5 ? '12mm 14mm' : '16mm 18mm'};
    }

    /* ── Encabezado ── */
    .header-wrap {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      border: 2px solid #111;
      margin-bottom: 8px;
    }
    .header-left {
      flex: 1;
      padding: ${isA5 ? '8px 12px' : '12px 16px'};
      border-right: 2px solid #111;
    }
    .header-center {
      width: ${isA5 ? '70px' : '90px'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-right: 2px solid #111;
      padding: 8px;
    }
    .header-right {
      flex: 1;
      padding: ${isA5 ? '8px 12px' : '12px 16px'};
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .comercio-nombre {
      font-size: ${isA5 ? '16px' : '20px'};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .comercio-info { font-size: ${isA5 ? '10px' : '11px'}; line-height: 1.6; color: #333; }

    .tipo-letra {
      font-size: ${isA5 ? '32px' : '42px'};
      font-weight: 900;
      line-height: 1;
    }
    .tipo-desc {
      font-size: 9px;
      text-align: center;
      margin-top: 2px;
      line-height: 1.3;
    }

    .doc-title { font-size: ${isA5 ? '13px' : '15px'}; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
    .doc-info { font-size: ${isA5 ? '10px' : '11px'}; line-height: 1.8; }
    .doc-info span { font-weight: 600; }

    /* ── Datos del comprobante ── */
    .datos-wrap {
      border: 1px solid #bbb;
      padding: ${isA5 ? '6px 10px' : '8px 14px'};
      margin-bottom: 10px;
      display: flex;
      gap: 24px;
      font-size: ${isA5 ? '10px' : '11px'};
    }
    .datos-wrap .field { display: flex; gap: 6px; }
    .datos-wrap .field span { font-weight: 600; }

    /* ── Tabla de items ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: ${isA5 ? '10px' : '12px'};
    }
    thead th {
      background: #111;
      color: #fff;
      padding: ${isA5 ? '5px 6px' : '7px 8px'};
      text-align: left;
      font-weight: 600;
      font-size: ${isA5 ? '10px' : '11px'};
    }
    thead th.td-center { text-align: center; }
    thead th.td-right  { text-align: right; }
    tbody td {
      padding: ${isA5 ? '4px 6px' : '6px 8px'};
      border-bottom: 1px solid #e8e8e8;
      vertical-align: top;
    }
    .row-even td { background: #fafafa; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; white-space: nowrap; }

    /* Rellenar filas vacías para que la tabla ocupe espacio */
    .empty-row td { padding: ${isA5 ? '12px 6px' : '16px 8px'}; border-bottom: 1px solid #e8e8e8; }

    /* ── Totales ── */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    .totals-table {
      width: ${isA5 ? '200px' : '240px'};
      border: 1px solid #bbb;
    }
    .totals-table td {
      padding: ${isA5 ? '4px 10px' : '5px 12px'};
      font-size: ${isA5 ? '11px' : '12px'};
    }
    .totals-table .label { color: #555; }
    .totals-table .value { text-align: right; font-weight: 600; }
    .totals-table .total-row td {
      background: #111;
      color: #fff;
      font-size: ${isA5 ? '13px' : '15px'};
      font-weight: 700;
      padding: ${isA5 ? '6px 10px' : '8px 12px'};
    }

    /* ── Forma de pago ── */
    .pago-wrap {
      border: 1px solid #bbb;
      padding: ${isA5 ? '5px 10px' : '6px 12px'};
      margin-bottom: 12px;
      font-size: ${isA5 ? '10px' : '11px'};
      display: inline-block;
    }
    .pago-wrap span { font-weight: 600; }

    /* ── Footer ── */
    .footer {
      border-top: 1px dashed #999;
      padding-top: 8px;
      text-align: center;
      font-size: ${isA5 ? '9px' : '10px'};
      color: #666;
      line-height: 1.6;
    }

    @media print {
      body { padding: 8mm 10mm; }
      @page { size: ${pageSize}; margin: 0; }
    }
  </style>
</head>
<body>

  <!-- Encabezado principal -->
  <div class="header-wrap">
    <div class="header-left">
      <div class="comercio-nombre">${nombreComercio}</div>
      <div class="comercio-info">
        ${direccion ? `<div>${direccion}</div>` : ''}
        ${telefono  ? `<div>Tel: ${telefono}</div>` : ''}
        ${cuit      ? `<div>CUIT: ${cuit}</div>` : ''}
      </div>
    </div>
    <div class="header-center">
      <div class="tipo-letra">X</div>
      <div class="tipo-desc">COMP.<br>INTERNO</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Comprobante de Venta</div>
      <div class="doc-info">
        <div><span>N°:</span> 0001-${numero}</div>
        <div><span>Fecha:</span> ${fecha}</div>
        <div><span>Hora:</span> ${hora}</div>
        ${venta.usuario_nombre ? `<div><span>Vendedor:</span> ${venta.usuario_nombre}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Datos adicionales -->
  <div class="datos-wrap">
    <div class="field"><span>Forma de pago:</span>${metodoPagoLabel}</div>
    ${venta.notas ? `<div class="field"><span>Notas:</span>${venta.notas}</div>` : ''}
  </div>

  <!-- Tabla de productos -->
  <table>
    <thead>
      <tr>
        <th class="td-center" style="width:36px">#</th>
        <th class="td-center" style="width:48px">Cant.</th>
        <th>Descripción</th>
        <th class="td-right" style="width:90px">P. Unit.</th>
        <th class="td-right" style="width:90px">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
      ${Array.from({ length: Math.max(0, (isA5 ? 6 : 8) - items.length) })
        .map(() => `<tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>`)
        .join('')}
    </tbody>
  </table>

  <!-- Totales -->
  <div class="totals-wrap">
    <table class="totals-table">
      <tbody>
        <tr>
          <td class="label">Subtotal</td>
          <td class="value">$${Number(venta.subtotal).toFixed(2)}</td>
        </tr>
        ${Number(venta.descuento) > 0 ? `
        <tr>
          <td class="label">Descuento</td>
          <td class="value" style="color:#cc3300">-$${Number(venta.descuento).toFixed(2)}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td>TOTAL</td>
          <td style="text-align:right">$${Number(venta.total).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>${ticketFooter}</div>
    <div style="margin-top:3px">Documento no válido como factura fiscal &nbsp;·&nbsp; Generado el ${dayjs().format('DD/MM/YYYY HH:mm')}</div>
  </div>

</body>
</html>`
}

/**
 * Genera el HTML del ticket de venta para impresora térmica 80mm.
 */
export function generateTicketHTML(venta, items, config = {}) {
  const {
    nombreComercio = 'Mi Comercio',
    direccion = '',
    telefono = '',
    cuit = '',
    ticketFooter = 'Gracias por su compra!'
  } = config
  const footer = ticketFooter

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
