import { Difficulty } from '../../types/engine'

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
}

export interface SevenPuzzle {
  id: string
  seed: number
  playerCount: 2 | 3 | 4
  passLimit: number
  difficulty: Difficulty
}

export interface FieldRange {
  min: Rank
  max: Rank
  started: boolean
}

export interface SevenState {
  hands: Card[][]
  field: Record<Suit, FieldRange>
  currentPlayer: number
  passCount: number[]
  finished: number[]
  startedAt: number
  elapsedSeconds: number
}

export interface SevenMove {
  type: 'play' | 'pass'
  card?: Card
}
