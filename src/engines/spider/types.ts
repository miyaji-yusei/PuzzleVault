import { Difficulty } from '../../types/engine'

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface SpiderPuzzle {
  id: string
  seed: number
  suitCount: 1 | 2 | 4
  difficulty: Difficulty
}

export interface SpiderState {
  tableau: Card[][]    // 10列
  stock: Card[][]      // 最大5回分のディール（各10枚）
  foundation: number   // 完成セット数（0〜8）
  moves: number
  startedAt: number
  elapsedSeconds: number
}

export interface SpiderMove {
  type: 'move' | 'deal' | 'undo'
  from?: { col: number; cardIndex: number }
  to?: { col: number }
}
