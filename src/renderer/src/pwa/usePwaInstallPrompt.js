import { useCallback, useEffect, useState } from 'react'

export function usePwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(() =>
    typeof window !== 'undefined' ? window.__PWA_INSTALL_PROMPT__ || null : null
  )
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setInstallPrompt(typeof window !== 'undefined' ? window.__PWA_INSTALL_PROMPT__ || null : null)
    const onAvailable = () => setInstallPrompt(window.__PWA_INSTALL_PROMPT__ || null)
    const onInstalled = () => {
      setInstallPrompt(null)
      setInstalling(false)
    }
    window.addEventListener('gcom:pwa-install-available', onAvailable)
    window.addEventListener('gcom:pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('gcom:pwa-install-available', onAvailable)
      window.removeEventListener('gcom:pwa-installed', onInstalled)
    }
  }, [])

  const installApp = useCallback(async () => {
    const p = window.__PWA_INSTALL_PROMPT__ || installPrompt
    if (!p) return
    setInstalling(true)
    try {
      await p.prompt()
      await p.userChoice
      setInstallPrompt(null)
      window.__PWA_INSTALL_PROMPT__ = null
    } catch {
      void 0
    } finally {
      setInstalling(false)
    }
  }, [installPrompt])

  return { installPrompt, installing, installApp }
}
