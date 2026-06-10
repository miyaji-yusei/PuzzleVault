import { applyLead, getLegalLeadMoves, getTeamScore, teamOf } from './rules'
import { Difficulty, GoitaState, PIECE_VALUE } from './types'

const WIN_SCORE = 1000

// 自チーム視点のスコア(獲得駒の価値差)。終局していれば勝敗を大きな値で表す
function evaluate(state: GoitaState, aiTeam: number): number {
  if (state.finished && state.winningTeam !== null) {
    return state.winningTeam === aiTeam ? WIN_SCORE : -WIN_SCORE
  }
  return getTeamScore(state, aiTeam) - getTeamScore(state, 1 - aiTeam)
}

// 自チームの手番ではmaxを、相手チームの手番ではminを取るミニマックス探索
function minimax(state: GoitaState, depth: number, aiTeam: number): number {
  if (state.finished || depth === 0) {
    return evaluate(state, aiTeam)
  }

  const moves = getLegalLeadMoves(state)
  const isAiTurn = teamOf(state, state.currentPlayer) === aiTeam

  let best = isAiTurn ? -Infinity : Infinity
  for (const move of moves) {
    const next = applyLead(state, move)
    const value = minimax(next, depth - 1, aiTeam)
    best = isAiTurn ? Math.max(best, value) : Math.min(best, value)
  }
  return best
}

// 貪欲法: 価値が最も低い駒から出し、強い駒を温存する
function chooseGreedyMove(state: GoitaState, moves: number[]): number {
  const hand = state.hands[state.currentPlayer]
  let best = moves[0]
  let bestValue = PIECE_VALUE[hand[best].type]

  for (const move of moves) {
    const value = PIECE_VALUE[hand[move].type]
    if (value < bestValue) {
      bestValue = value
      best = move
    }
  }
  return best
}

// ミニマックス法: depth手先まで読み、自チームの評価値が最大になる手を選ぶ
function chooseMinimaxMove(state: GoitaState, moves: number[], depth: number): number {
  const aiTeam = teamOf(state, state.currentPlayer)

  let best = moves[0]
  let bestValue = -Infinity
  for (const move of moves) {
    const next = applyLead(state, move)
    const value = minimax(next, depth - 1, aiTeam)
    if (value > bestValue) {
      bestValue = value
      best = move
    }
  }
  return best
}

// AIが現在のリードプレイヤーとして出す駒(手札のインデックス)を選択する。
// easy: 貪欲法 / normal: ミニマックス2手 / hard・expert: ミニマックス3手
export function chooseMove(state: GoitaState, difficulty: Difficulty): number {
  const moves = getLegalLeadMoves(state)
  if (moves.length === 0) {
    throw new Error('chooseMove called on a state with no legal moves')
  }
  if (moves.length === 1) return moves[0]

  if (difficulty === 'easy') {
    return chooseGreedyMove(state, moves)
  }

  const depth = difficulty === 'normal' ? 2 : 3
  return chooseMinimaxMove(state, moves, depth)
}
