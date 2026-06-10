import { create } from 'zustand'

interface SettingsState {
  soundEnabled: boolean
  vibrationEnabled: boolean
  theme: 'light' | 'dark'
  isPurchased: boolean
  solitaireAllowDealWithEmptyColumn: boolean
  setSoundEnabled: (enabled: boolean) => void
  setVibrationEnabled: (enabled: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setPurchased: (purchased: boolean) => void
  setSolitaireAllowDealWithEmptyColumn: (allow: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  soundEnabled: true,
  vibrationEnabled: true,
  theme: 'light',
  isPurchased: false,
  solitaireAllowDealWithEmptyColumn: false,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
  setTheme: (theme) => set({ theme }),
  setPurchased: (purchased) => set({ isPurchased: purchased }),
  setSolitaireAllowDealWithEmptyColumn: (allow) => set({ solitaireAllowDealWithEmptyColumn: allow }),
}))
