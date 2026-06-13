import { Card, HAND_SIZE, SevenState, SUITS } from './types'

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

// 52枚のトランプ＋ジョーカー2枚、計54枚のデッキを生成する
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank })
    }
  }
  deck.push({ suit: 'joker', rank: 0 })
  deck.push({ suit: 'joker', rank: 0 })
  return deck
}

// 山札をシャッフルし、プレイヤー・AIに各7枚配って初期状態を作る。同一seedなら同一結果になる。
// 末尾が山札の一番上(引き札)。初期捨て札がジョーカーの場合は山の底に戻して引き直す
export function createInitialState(seed: number): SevenState {
  const actualSeed = seed >>> 0
  const rng = createRng(actualSeed)
  const deck = shuffle(createDeck(), rng)

  const hands: [Card[], Card[]] = [[], []]
  for (let i = 0; i < HAND_SIZE; i++) {
    hands[0].push(deck.pop() as Card)
    hands[1].push(deck.pop() as Card)
  }

  let top = deck.pop() as Card
  while (top.suit === 'joker') {
    deck.unshift(top)
    top = deck.pop() as Card
  }
  const discard: Card[] = [top]

  return {
    deck,
    hands,
    discard,
    previousTop: discard[discard.length - 1],
    currentPlayer: 0,
    phase: 'playing',
    winner: null,
    seed: actualSeed,
  }
}
