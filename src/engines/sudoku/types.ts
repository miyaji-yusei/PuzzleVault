import { Difficulty } from '../../types/engine'

export type Cell = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null
export type Board = Cell[][]

export interface SudokuPuzzle {
  id: string
  board: Board
  solution: Board
  difficulty: Difficulty
  seed: number
}

export interface SudokuState extends SudokuPuzzle {
  current: Board
  notes: boolean[][][]  // [row][col][1-9] メモ機能（index 1〜9を使用）
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface SudokuMove {
  row: number
  col: number
  value: Cell
  isNote: boolean
}
