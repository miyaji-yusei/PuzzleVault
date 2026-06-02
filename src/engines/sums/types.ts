import { Difficulty } from '../../types/engine'

export type CellValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null

export interface BlackCell {
  type: 'black'
  sumRight?: number
  sumDown?: number
}

export interface WhiteCell {
  type: 'white'
  value: CellValue
}

export type GridCell = BlackCell | WhiteCell

export interface SumsPuzzle {
  id: string
  size: number
  grid: GridCell[][]
  solution: (CellValue | null)[][]
  difficulty: Difficulty
  seed: number
}

export interface SumsState extends SumsPuzzle {
  current: (CellValue | null)[][]
  notes: Set<number>[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface SumsMove {
  row: number
  col: number
  value: CellValue
  isNote: boolean
}
