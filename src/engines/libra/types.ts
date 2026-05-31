import { Difficulty } from '../../types/engine'
export { Difficulty }

export type CellValue = 'A' | 'B' | null
export type ConstraintType = 'eq' | 'neq'

export interface Constraint {
  r1: number; c1: number
  r2: number; c2: number
  type: ConstraintType
}

export interface LibraPuzzle {
  id: string
  size: number
  initial: CellValue[][]
  solution: CellValue[][]
  constraints: Constraint[]
  difficulty: Difficulty
  seed: number
}

export interface LibraState extends LibraPuzzle {
  current: CellValue[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface LibraMove {
  row: number
  col: number
  value: CellValue
}
