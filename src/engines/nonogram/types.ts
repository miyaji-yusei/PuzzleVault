import { Difficulty } from '../../types/engine'

export type CellState = 'empty' | 'filled' | 'crossed'

export interface NonogramPuzzle {
  id: string
  size: number
  rowClues: number[][]
  colClues: number[][]
  solution: boolean[][]
  difficulty: Difficulty
  seed: number
  title?: string
}

export interface NonogramState extends NonogramPuzzle {
  current: CellState[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface NonogramMove {
  row: number
  col: number
  state: CellState
}
