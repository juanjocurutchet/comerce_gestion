import { create } from 'zustand'

const STORAGE_KEY = 'gc-theme'

export const useThemeStore = create((set) => ({
  dark: localStorage.getItem(STORAGE_KEY) === 'dark',
  toggle: () =>
    set((state) => {
      const next = !state.dark
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      return { dark: next }
    })
}))
