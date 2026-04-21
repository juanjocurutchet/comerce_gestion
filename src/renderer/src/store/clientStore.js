import { create } from 'zustand'

export const APP_BROWSER_TITLE = 'Nexo Commerce'

const DEFAULT_FEATURES = {
  ventas: true,
  cotizaciones: true,
  productos: true,
  stock: true,
  proveedores: true,
  caja: true,
  reportes: true,
  usuarios: true,
  backup: true,
  configuracion: true
}

export const useClientStore = create((set) => ({
  features: DEFAULT_FEATURES,
  clientName: '',
  isAdmin: false,
  publicDemoUrl: '',
  logo: null,
  logoIcon: null,
  loaded: false,
  load: async () => {
    if (!window.api?.client?.getConfig) {
      set({ loaded: true })
      return
    }
    const config = await window.api.client.getConfig()
    set({
      features: { ...DEFAULT_FEATURES, ...config.features },
      clientName: config.clientName || '',
      isAdmin: config.isAdmin === true,
      publicDemoUrl: typeof config.publicDemoUrl === 'string' ? config.publicDemoUrl : '',
      logo: config.logo?.full || null,
      logoIcon: config.logo?.icon || null,
      loaded: true
    })
    if (window.api.client?.setTitle) window.api.client.setTitle(APP_BROWSER_TITLE)
  },
  setFromLicense: (clientName, features) => {
    set({
      clientName: clientName || '',
      features: features ? { ...DEFAULT_FEATURES, ...features } : DEFAULT_FEATURES
    })
  }
}))
