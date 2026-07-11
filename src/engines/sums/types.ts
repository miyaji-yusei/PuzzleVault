import { Difficulty } from '../../types/engine'

export type CellMark = 'circle' | 'cross' | null

export interface ColorGroup {
  id: number
  colorIndex: number
  cells: [number, number][]
  targetSum: number
}

export interface SumsPuzzle {
  id: string
  grid: number[][]
  solution: CellMark[][]
  rowSums: number[]
  colSums: number[]
  colorGroups: ColorGroup[]
  difficulty: Difficulty
  seed: number
}

export interface SumsState extends SumsPuzzle {
  current: CellMark[][]
  mistakes: number
  startedAt: number
  elapsedSeconds: number
}

export interface SumsMove {
  row: number
  col: number
  mark: CellMark
}
