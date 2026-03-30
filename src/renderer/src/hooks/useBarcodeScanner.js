import { useEffect, useRef, useCallback } from 'react'

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
      const tag = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      const now = Date.now()
      const delta = now - lastKey.current
      lastKey.current = now

      if (delta > maxDelay * 3) {
        buffer.current = ''
      }

      if (e.key === 'Enter') {
        if (!isInput) {
          e.preventDefault()
          flush()
        } else if (buffer.current.length > 0 && delta < maxDelay) {
          flush()
        } else {
          buffer.current = ''
        }
        clearTimeout(timer.current)
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (isInput && delta > maxDelay * 2) {
          buffer.current = ''
          return
        }
        buffer.current += e.key

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
