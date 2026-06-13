import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsState {
  soundEnabled: boolean
  vibrationEnabled: boolean
  theme: 'light' | 'dark'
  isPurchased: boolean
  solitaireAllowDealWithEmptyColumn: boolean
  solitaireLandscapeEnabled: boolean
  spiderLandscapeEnabled: boolean
  goitaHowToPlayShown: boolean
  sevenHowToPlayShown: boolean
  sevenTutorialShown: boolean
  setSoundEnabled: (enabled: boolean) => void
  setVibrationEnabled: (enabled: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setPurchased: (purchased: boolean) => void
  setSolitaireAllowDealWithEmptyColumn: (allow: boolean) => void
  setSolitaireLandscapeEnabled: (enabled: boolean) => void
  setSpiderLandscapeEnabled: (enabled: boolean) => void
  setGoitaHowToPlayShown: (shown: boolean) => void
  setSevenHowToPlayShown: (shown: boolean) => void
  setSevenTutorialShown: (shown: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      vibrationEnabled: true,
      theme: 'light',
      isPurchased: false,
      solitaireAllowDealWithEmptyColumn: false,
      solitaireLandscapeEnabled: false,
      spiderLandscapeEnabled: false,
      goitaHowToPlayShown: false,
      sevenHowToPlayShown: false,
      sevenTutorialShown: false,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setVibrationEnabled: (enabled) => set({ vibrationEnabled: enabled }),
      setTheme: (theme) => set({ theme }),
      setPurchased: (purchased) => set({ isPurchased: purchased }),
      setSolitaireAllowDealWithEmptyColumn: (allow) => set({ solitaireAllowDealWithEmptyColumn: allow }),
      setSolitaireLandscapeEnabled: (enabled) => set({ solitaireLandscapeEnabled: enabled }),
      setSpiderLandscapeEnabled: (enabled) => set({ spiderLandscapeEnabled: enabled }),
      setGoitaHowToPlayShown: (shown) => set({ goitaHowToPlayShown: shown }),
      setSevenHowToPlayShown: (shown) => set({ sevenHowToPlayShown: shown }),
      setSevenTutorialShown: (shown) => set({ sevenTutorialShown: shown }),
    }),
    {
      name: 'puzzlevault-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
