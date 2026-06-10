import { Difficulty } from '../../types/engine'
export { Difficulty }

export type PieceType =
  | 'king' | 'rook' | 'bishop' | 'gold' | 'silver'
  | 'knight' | 'lance' | 'pawn' | 'shi' | 'do'
  | 'ne' | 'hi' | 'ko' | 'sa'

export interface Piece {
  type: PieceType
  faceUp: boolean
}

export interface GoitaState {
  hands: Piece[][]              // 4プレイヤーの手札
  board: Piece | null           // 場に出ている駒(手番解決後は常にnull)
  currentPlayer: number         // 次にリードする(駒を出す)プレイヤー
  teams: [number, number][]     // チーム分け([0,2]と[1,3])
  captured: PieceType[][]       // プレイヤーごとの獲得駒(取った駒+取られた駒のペア)
  finished: boolean
  winningTeam: number | null    // 勝利チームのインデックス(teamsのインデックス)
  seed: number
}

// 駒は全40枚(各プレイヤーに10枚ずつ配布)。
// 仕様書の枚数表記(歩兵x8で計42枚)は40枚配布の前提と矛盾するため、
// 歩兵をx6として総数40枚に調整している。
export const PIECE_TYPES: PieceType[] = [
  'king', 'rook', 'bishop', 'gold', 'silver',
  'knight', 'lance', 'pawn', 'shi', 'do', 'ne', 'hi', 'ko', 'sa',
]

export const PIECE_COUNTS: Record<PieceType, number> = {
  king: 2,
  rook: 2,
  bishop: 2,
  gold: 4,
  silver: 4,
  knight: 4,
  lance: 4,
  pawn: 6,
  shi: 2,
  do: 2,
  ne: 2,
  hi: 2,
  ko: 2,
  sa: 2,
}

export const TOTAL_PIECE_COUNT = Object.values(PIECE_COUNTS).reduce((sum, n) => sum + n, 0)

// AIの評価・貪欲選択に使う駒の価値(数字が大きいほど強い駒)
export const PIECE_VALUE: Record<PieceType, number> = {
  king: 14,
  rook: 13,
  bishop: 12,
  gold: 11,
  silver: 10,
  knight: 9,
  lance: 8,
  shi: 7,
  do: 6,
  ne: 5,
  hi: 4,
  ko: 3,
  sa: 2,
  pawn: 1,
}
