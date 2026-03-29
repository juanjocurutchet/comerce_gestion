import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook que detecta entrada de lector de código de barras USB (HID).
 * Los lectores escriben caracteres muy rápido (< 50ms entre teclas) y terminan con Enter.
 * @param {function} onScan  - callback recibe el código escaneado
 * @param {object}   options
 *   - minLength: longitud mínima para considerar un código válido (default 3)
 *   - maxDelay:  ms máximo entre teclas del lector (default 50)
 *   - enabled:   activar/desactivar (default true)
 */
export function useBarcodeScanner(onScan, { minLength = 3, maxDelay = 50, enabled = true } = {}) {
  const buffer = useRef('')
  const lastKey = useRef(0)
  const timer = useRef(null)

  const flush = useCallback(() => {
    const code = buffer.current.trim()
    buffer.current = ''
    if (code.length >= minLength) {
      onScan(code)
    }
  }, [onScan, minLength])

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e) {
      // Ignorar si el foco está en un input/textarea/select (el usuario está escribiendo)
      const tag = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      const now = Date.now()
      const delta = now - lastKey.current
      lastKey.current = now

      // Si el delta es grande, resetear el buffer (nueva secuencia)
      if (delta > maxDelay * 3) {
        buffer.current = ''
      }

      if (e.key === 'Enter') {
        if (!isInput) {
          // Enter global sin foco en input → probablemente es el lector
          e.preventDefault()
          flush()
        } else if (buffer.current.length > 0 && delta < maxDelay) {
          // Enter rápido desde un input → también puede ser el lector
          flush()
        } else {
          buffer.current = ''
        }
        clearTimeout(timer.current)
        return
      }

      // Solo acumular caracteres imprimibles
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isInput && delta > maxDelay * 2) {
          // Tipeo lento en un input = usuario escribiendo, no acumular
          buffer.current = ''
          return
        }
        buffer.current += e.key

        // Timer de seguridad: si no llega Enter, limpiar buffer
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          buffer.current = ''
        }, 300)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer.current)
    }
  }, [enabled, flush, maxDelay])
}
