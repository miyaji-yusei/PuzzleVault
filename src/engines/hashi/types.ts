import { Difficulty } from '../../types/engine'

export interface Island {
  id: number
  row: number
  col: number
  bridges: number
}

export interface Bridge {
  from: number
  to: number
  count: 1 | 2
}

export interface HashiPuzzle {
  id: string
  gridSize: number
  islands: Island[]
  solution: Bridge[]
  difficulty: Difficulty
  seed: number
}

export interface HashiState extends HashiPuzzle {
  current: Bridge[]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface HashiMove {
  fromIslandId: number
  toIslandId: number
  action: 'add' | 'remove'
}
