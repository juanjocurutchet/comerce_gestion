import { useState } from 'react'
import * as XLSX from 'xlsx'
import { message } from 'antd'

const useExport = () => {
  const [exporting, setExporting] = useState(false)

  const exportToExcel = async (columns, data, filename = 'export') => {
    if (!data?.length) {
      message.warning('No hay datos para exportar')
      return
    }
    setExporting(true)
    try {
      const rows = data.map(row =>
        Object.fromEntries(
          columns
            .filter(col => col.dataIndex && col.title)
            .map(col => [
              col.title,
              col.exportRender
                ? col.exportRender(row[col.dataIndex], row)
                : (row[col.dataIndex] ?? '')
            ])
        )
      )
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Datos')

      const colWidths = columns
        .filter(col => col.dataIndex && col.title)
        .map(col => ({ wch: Math.max(col.title.length, 14) }))
      ws['!cols'] = colWidths

      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `${filename}_${date}.xlsx`)
      message.success('Archivo Excel generado')
    } catch (e) {
      message.error('Error al exportar: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  return { exportToExcel, exporting }
}

export default useExport
