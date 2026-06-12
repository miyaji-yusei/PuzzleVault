import type { Difficulty } from '../types/engine'

export const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && VALID_DIFFICULTIES.includes(value as Difficulty)
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '初級',
  normal: '中級',
  hard: '上級',
  expert: 'エキスパート',
}
