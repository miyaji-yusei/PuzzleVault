import { create } from 'zustand'
import type { Difficulty } from '../types/engine'

interface GameRecord {
  gameId: string
  difficulty: Difficulty
  completedAt: number
  elapsedSeconds: number
  moves?: number
}

export interface SolitaireStats {
  totalPlayed: number
  totalCleared: number
}

export interface SevenStats {
  totalPlayed: number
  totalWon: number
}

interface ProgressState {
  records: GameRecord[]
  consecutiveDays: number
  lastPlayedDate: string | null
  solitaireStats: SolitaireStats
  sevenStats: SevenStats
  recordClear: (record: GameRecord) => void
  getStatsByGame: (gameId: string) => GameRecord[]
  getStatsByDifficulty: (gameId: string, difficulty: Difficulty) => GameRecord[]
  recordSolitairePlay: () => void
  recordSolitaireClear: () => void
  recordSevenPlay: () => void
  recordSevenWin: () => void
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  records: [],
  consecutiveDays: 0,
  lastPlayedDate: null,
  solitaireStats: { totalPlayed: 0, totalCleared: 0 },
  sevenStats: { totalPlayed: 0, totalWon: 0 },
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
  recordSolitairePlay: () =>
    set((state) => ({
      solitaireStats: {
        ...state.solitaireStats,
        totalPlayed: state.solitaireStats.totalPlayed + 1,
      },
    })),
  recordSolitaireClear: () =>
    set((state) => ({
      solitaireStats: {
        ...state.solitaireStats,
        totalCleared: state.solitaireStats.totalCleared + 1,
      },
    })),
  recordSevenPlay: () =>
    set((state) => ({
      sevenStats: {
        ...state.sevenStats,
        totalPlayed: state.sevenStats.totalPlayed + 1,
      },
    })),
  recordSevenWin: () =>
    set((state) => ({
      sevenStats: {
        ...state.sevenStats,
        totalWon: state.sevenStats.totalWon + 1,
      },
    })),
}))
