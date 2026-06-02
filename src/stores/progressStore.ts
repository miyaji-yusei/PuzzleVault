import { create } from 'zustand'
import type { Difficulty } from '../types/engine'

interface GameRecord {
  gameId: string
  difficulty: Difficulty
  completedAt: number
  elapsedSeconds: number
  moves?: number
}

interface ProgressState {
  records: GameRecord[]
  consecutiveDays: number
  lastPlayedDate: string | null
  recordClear: (record: GameRecord) => void
  getStatsByGame: (gameId: string) => GameRecord[]
  getStatsByDifficulty: (gameId: string, difficulty: Difficulty) => GameRecord[]
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  records: [],
  consecutiveDays: 0,
  lastPlayedDate: null,
  recordClear: (record) => {
    const today = new Date().toISOString().substring(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10)
    const { lastPlayedDate, consecutiveDays } = get()
    const newConsecutiveDays =
      lastPlayedDate === today
        ? consecutiveDays
        : lastPlayedDate === yesterday
        ? consecutiveDays + 1
        : 1
    set((state) => ({
      records: [...state.records, record],
      consecutiveDays: newConsecutiveDays,
      lastPlayedDate: today,
    }))
  },
  getStatsByGame: (gameId) =>
    get().records.filter((r) => r.gameId === gameId),
  getStatsByDifficulty: (gameId, difficulty) =>
    get().records.filter(
      (r) => r.gameId === gameId && r.difficulty === difficulty
    ),
}))
