import { create } from 'zustand'

export const useLicenseStore = create((set) => ({
  status: null,
  checked: false,
  check: async () => {
    const status = await window.api.license.check()
    set({ status, checked: true })
    return status
  }
}))
