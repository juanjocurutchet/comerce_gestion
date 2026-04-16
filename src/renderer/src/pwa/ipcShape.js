/** Misma forma que `ipcMain.handle` + `handle()` en Electron: `{ ok, data?, error? }` */
export const ipcOk = (data) => ({ ok: true, data })
export const ipcErr = (error) => ({
  ok: false,
  error: error == null ? 'Error' : String(error)
})
