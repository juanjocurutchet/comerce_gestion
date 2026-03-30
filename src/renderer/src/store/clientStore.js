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
  loaded: false,
  load: async () => {
    const config = await window.api.client.getConfig()
    set({
      features: { ...DEFAULT_FEATURES, ...config.features },
      clientName: config.clientName || '',
      loaded: true
    })
  }
}))
