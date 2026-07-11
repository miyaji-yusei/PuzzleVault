import { Difficulty } from '../../types/engine'

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface SolitairePuzzle {
  id: string
  seed: number
  drawMode: 1 | 3
  difficulty: Difficulty
}

export interface SolitaireState {
  tableau: Card[][]
  foundation: Card[][]
  stock: Card[]
  waste: Card[]
  moves: number
  score: number
  stockResets: number
  startedAt: number
  elapsedSeconds: number
}

export interface SolitaireMove {
  type: 'tableau-to-tableau' | 'tableau-to-foundation' | 'waste-to-tableau'
        | 'waste-to-foundation' | 'stock-draw' | 'stock-reset' | 'foundation-to-tableau'
  from?: { pile: 'tableau' | 'waste' | 'foundation'; index: number; cardIndex?: number }
  to?: { pile: 'tableau' | 'foundation'; index: number }
}
