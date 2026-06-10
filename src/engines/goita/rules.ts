import { GoitaState, Piece, PieceType, PIECE_VALUE } from './types'

// 手札の中で指定の種類と一致する駒のインデックス一覧を返す
export function getMatchingIndices(hand: Piece[], type: PieceType): number[] {
  const result: number[] = []
  hand.forEach((piece, i) => {
    if (piece.type === type) result.push(i)
  })
  return result
}

// 現在のリードプレイヤーが出せる手(手札のインデックス一覧)。手札の駒は全て出せる
export function getLegalLeadMoves(state: GoitaState): number[] {
  if (state.finished) return []
  return state.hands[state.currentPlayer].map((_, i) => i)
}

export function isGameOver(state: GoitaState): boolean {
  return state.finished
}

export function getWinningTeam(state: GoitaState): number | null {
  return state.winningTeam
}

// プレイヤーが所属するチームのインデックス(teams配列のインデックス)を返す
export function teamOf(state: GoitaState, player: number): number {
  return state.teams.findIndex((team) => team.includes(player))
}

// チームが獲得した駒の合計価値
export function getTeamScore(state: GoitaState, team: number): number {
  return state.teams[team].reduce((sum, player) => {
    const playerScore = state.captured[player].reduce((s, type) => s + PIECE_VALUE[type], 0)
    return sum + playerScore
  }, 0)
}

interface Capturer {
  player: number
  handIndex: number
}

// leaderの次のプレイヤーから順に、出された駒(piece)と同種の駒を持つ最初のプレイヤーを探す。
// 一周して誰も取れなければnull(パス)
function findCapturer(hands: Piece[][], leader: number, piece: Piece): Capturer | null {
  for (let offset = 1; offset <= 3; offset++) {
    const player = (leader + offset) % 4
    const matches = getMatchingIndices(hands[player], piece.type)
    if (matches.length > 0) {
      return { player, handIndex: matches[0] }
    }
  }
  return null
}

// リードプレイヤーが手札のhandIndexの駒を出し、取り合い(取る/パス)を解決した結果の状態を返す。
// - 同種の駒を持つプレイヤーが見つかればその駒で自動的に取り、そのプレイヤーが次のリーダーになる
// - 誰も取れなければ場の駒は流れ、リードプレイヤーが続けて出す
// - いずれかのプレイヤーの手札が0枚になった時点でゲーム終了とし、そのプレイヤーのチームを勝者とする
export function applyLead(state: GoitaState, handIndex: number): GoitaState {
  if (state.finished) return state

  const leader = state.currentPlayer
  const leaderHand = [...state.hands[leader]]
  const piece = leaderHand[handIndex]
  if (!piece) return state
  leaderHand.splice(handIndex, 1)

  const hands = state.hands.map((hand, i) => (i === leader ? leaderHand : [...hand]))
  const captured = state.captured.map((c) => [...c])

  if (leaderHand.length === 0) {
    return {
      ...state,
      hands,
      captured,
      board: null,
      finished: true,
      winningTeam: teamOf(state, leader),
    }
  }

  const capturer = findCapturer(hands, leader, piece)

  if (!capturer) {
    // 誰も取れない: 場の駒は流れ、リードプレイヤーが続けて出す
    return {
      ...state,
      hands,
      captured,
      board: null,
      currentPlayer: leader,
    }
  }

  const capturerHand = [...hands[capturer.player]]
  const [capturedPiece] = capturerHand.splice(capturer.handIndex, 1)
  hands[capturer.player] = capturerHand
  captured[capturer.player] = [...captured[capturer.player], piece.type, capturedPiece.type]

  if (capturerHand.length === 0) {
    return {
      ...state,
      hands,
      captured,
      board: null,
      currentPlayer: capturer.player,
      finished: true,
      winningTeam: teamOf(state, capturer.player),
    }
  }

  return {
    ...state,
    hands,
    captured,
    board: null,
    currentPlayer: capturer.player,
  }
}
