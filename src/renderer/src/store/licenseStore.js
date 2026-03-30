import { create } from 'zustand'
import { useClientStore } from './clientStore'

export const useLicenseStore = create((set) => ({
  status: null,
  checked: false,
  check: async () => {
    const status = await window.api.license.check()
    set({ status, checked: true })
    if (status.valid && status.clientName) {
      useClientStore.getState().setFromLicense(status.clientName, status.features)
    }
    return status
  }
}))
