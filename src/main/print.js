import { BrowserWindow, ipcMain } from 'electron'

export function setupPrint() {
  ipcMain.handle('print:ticket', async (_event, html, options = {}) => {
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        width: 400,
        height: 600,
        show: options.preview ?? false,
        title: 'Ticket de Venta',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })

      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      win.webContents.once('did-finish-load', () => {
        win.webContents.print(
          {
            silent: options.silent ?? false,
            printBackground: true,
            margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
            pageSize: options.pageSize ?? 'A4'
          },
          (success, reason) => {
            win.close()
            resolve({ ok: success, reason })
          }
        )
      })

      win.on('closed', () => resolve({ ok: false, reason: 'window-closed' }))
    })
  })
}
