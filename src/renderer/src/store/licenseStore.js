import { create } from 'zustand'
import { useClientStore, APP_BROWSER_TITLE } from './clientStore'

export const useLicenseStore = create((set) => ({
  status: null,
  checked: false,
  check: async () => {
    if (!window.api?.license?.check) {
      set({ status: { valid: true, daysLeft: 365, type: 'demo' }, checked: true })
      return { valid: true, daysLeft: 365, type: 'demo' }
    }
    const status = await window.api.license.check()
    set({ status, checked: true })
    if (status.valid && status.clientName && !useClientStore.getState().isAdmin) {
      useClientStore.getState().setFromLicense(status.clientName, status.features)
      if (window.api.client?.setTitle) window.api.client.setTitle(APP_BROWSER_TITLE)
    }
    return status
  }
}))
