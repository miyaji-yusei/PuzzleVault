import { Card, Rank, Suit, SolitaireState } from './types'

export function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const cards: Card[] = []
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank: rank as Rank, faceUp: false })
    }
  }
  return cards
}

export function dealState(seed: number, drawMode: 1 | 3): SolitaireState {
  void drawMode
  const rng = createRng(seed)
  const deck = shuffle(createDeck(), rng)
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let idx = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ ...deck[idx++], faceUp: row === col })
    }
  }
  return {
    tableau,
    foundation: [[], [], [], []],
    stock: deck.slice(idx).map(c => ({ ...c, faceUp: false })),
    waste: [],
    moves: 0,
    score: 0,
    stockResets: 0,
    startedAt: 0,
    elapsedSeconds: 0,
  }
}

export function cloneState(s: SolitaireState): SolitaireState {
  return {
    tableau: s.tableau.map(col => col.map(c => ({ ...c }))),
    foundation: s.foundation.map(f => f.map(c => ({ ...c }))),
    stock: s.stock.map(c => ({ ...c })),
    waste: s.waste.map(c => ({ ...c })),
    moves: s.moves,
    score: s.score,
    stockResets: s.stockResets,
    startedAt: s.startedAt,
    elapsedSeconds: s.elapsedSeconds,
  }
}

export function isComplete(s: SolitaireState): boolean {
  return s.foundation.reduce((sum, f) => sum + f.length, 0) === 52
}
