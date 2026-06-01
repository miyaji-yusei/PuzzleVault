import { Difficulty } from '../../types/engine'
export { Difficulty }

export type CellContent = 'A' | 'B' | 'empty' | 'crossed'
export type CellFixed = 'A' | null

export interface PandaPuzzle {
  id: string
  size: number
  fixed: CellFixed[][]
  rowCounts: number[]
  colCounts: number[]
  solution: CellContent[][]
  difficulty: Difficulty
  seed: number
}

export interface PandaState extends PandaPuzzle {
  current: CellContent[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface PandaMove {
  row: number
  col: number
  value: 'B' | 'crossed' | 'empty'
}
