import { Difficulty } from '../../types/engine'
import { Card, Rank, Suit, SevenPuzzle, SevenState, FieldRange } from './types'

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
    const tmp = result[i] as T; result[i] = result[j] as T; result[j] = tmp
  }
  return result
}

function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const deck: Card[] = []
  for (const suit of suits)
    for (let rank = 1; rank <= 13; rank++)
      deck.push({ suit, rank: rank as Rank })
  return deck
}

export function dealCards(seed: number, playerCount: 2 | 3 | 4): Card[][] {
  const rng = createRng(seed)
  const deck = shuffle(createDeck(), rng)
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  for (let i = 0; i < deck.length; i++) hands[i % playerCount].push(deck[i])
  return hands
}

export function createInitialState(puzzle: SevenPuzzle): SevenState {
  const hands = dealCards(puzzle.seed, puzzle.playerCount)
  const emptyRange = (): FieldRange => ({ min: 7 as Rank, max: 7 as Rank, started: false })
  return {
    hands,
    field: {
      spades: emptyRange(),
      hearts: emptyRange(),
      diamonds: emptyRange(),
      clubs: emptyRange(),
    },
    currentPlayer: 0,
    passCount: Array(puzzle.playerCount).fill(0),
    finished: [],
    startedAt: 0,
    elapsedSeconds: 0,
  }
}

const DIFFICULTY_CONFIG: Record<Difficulty, { playerCount: 2 | 3 | 4; passLimit: number }> = {
  easy:   { playerCount: 2, passLimit: 5 },
  normal: { playerCount: 3, passLimit: 4 },
  hard:   { playerCount: 4, passLimit: 3 },
  expert: { playerCount: 4, passLimit: 2 },
}

export function generate(difficulty: Difficulty, seed?: number): SevenPuzzle {
  const actualSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const { playerCount, passLimit } = DIFFICULTY_CONFIG[difficulty]
  return {
    id: `seven-${difficulty}-${actualSeed}`,
    seed: actualSeed,
    playerCount,
    passLimit,
    difficulty,
  }
}
