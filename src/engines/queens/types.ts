import { Difficulty } from '../../types/engine'
export { Difficulty }

export type ColorId = number  // 0〜N-1
export type CellState = 'empty' | 'queen' | 'crossed'

export interface QueensPuzzle {
  id: string
  size: number
  regions: ColorId[][]
  solution: boolean[][]
  difficulty: Difficulty
  seed: number
}

export interface QueensState extends QueensPuzzle {
  current: CellState[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface QueensMove {
  row: number
  col: number
  state: CellState
}
