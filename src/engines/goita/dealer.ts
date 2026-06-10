import { GoitaState, Piece, PIECE_COUNTS, PIECE_TYPES } from './types'

function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

// 全40枚の駒を生成し、4人に10枚ずつ配布する。同一seedなら同一配牌になる
export function deal(seed: number): Piece[][] {
  const rng = createRng(seed >>> 0)

  const deck: Piece[] = []
  for (const type of PIECE_TYPES) {
    for (let i = 0; i < PIECE_COUNTS[type]; i++) {
      deck.push({ type, faceUp: false })
    }
  }

  const shuffled = shuffle(deck, rng)
  const hands: Piece[][] = [[], [], [], []]
  shuffled.forEach((piece, i) => {
    hands[i % 4].push(piece)
  })

  return hands
}

// 配牌済みの初期状態を生成する
export function createInitialState(seed: number): GoitaState {
  const actualSeed = seed >>> 0
  return {
    hands: deal(actualSeed),
    board: null,
    currentPlayer: 0,
    teams: [[0, 2], [1, 3]],
    captured: [[], [], [], []],
    finished: false,
    winningTeam: null,
    seed: actualSeed,
  }
}
