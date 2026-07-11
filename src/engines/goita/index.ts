export { deal, createInitialState } from './dealer'
export { chooseMove } from './ai'
export {
  applyLead,
  getLegalLeadMoves,
  getMatchingIndices,
  getTeamScore,
  getWinningTeam,
  isGameOver,
  teamOf,
} from './rules'
export {
  PIECE_COUNTS,
  PIECE_TYPES,
  PIECE_VALUE,
  TOTAL_PIECE_COUNT,
} from './types'
export type { Difficulty, GoitaState, Piece, PieceType } from './types'
