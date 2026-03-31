import { create } from 'zustand'

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
  logo: null,
  logoIcon: null,
  loaded: false,
  load: async () => {
    const config = await window.api.client.getConfig()
    set({
      features: { ...DEFAULT_FEATURES, ...config.features },
      clientName: config.clientName || '',
      isAdmin: config.isAdmin === true,
      logo: config.logo?.full || null,
      logoIcon: config.logo?.icon || null,
      loaded: true
    })
    if (config.clientName) window.api.client.setTitle(config.clientName)
  },
  setFromLicense: (clientName, features) => {
    set({
      clientName: clientName || '',
      features: features ? { ...DEFAULT_FEATURES, ...features } : DEFAULT_FEATURES
    })
  }
}))
