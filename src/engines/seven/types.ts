import { Difficulty } from '../../types/engine'
export { Difficulty }

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'

export interface Card {
  suit: Suit
  rank: number // A=1 〜 K=13、ジョーカーは0
}

export type DrawSource = 'deck' | 'discard'
export type GamePhase = 'playing' | 'finished'

export interface SevenState {
  deck: Card[]
  hands: [Card[], Card[]] // [プレイヤー, AI]
  discard: Card[]
  // 現在の手番プレイヤーが捨てる前に捨て札の一番上だったカード(引く対象として選べる)
  previousTop: Card | null
  currentPlayer: 0 | 1
  phase: GamePhase
  winner: 0 | 1 | null
  seed: number
}

export interface SevenMove {
  indices: number[]
  source: DrawSource
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const HAND_SIZE = 7
export const WIN_THRESHOLD = 7
