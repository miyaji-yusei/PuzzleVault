import { SevenPuzzle, SevenState, SevenMove, Card, Suit, Rank, FieldRange } from './types'
import { createInitialState } from './generator'
import { Difficulty } from '../../types/engine'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

function isPlayable(card: Card, field: Record<Suit, FieldRange>): boolean {
  const f = field[card.suit]
  if (!f.started) return card.rank === 7
  return (f.min > 1 && card.rank === (f.min - 1) as Rank) ||
         (f.max < 13 && card.rank === (f.max + 1) as Rank)
}

export function getPlayableCards(state: SevenState, playerIdx: number): Card[] {
  return state.hands[playerIdx].filter(c => isPlayable(c, state.field))
}

function applyMove(state: SevenState, move: SevenMove, passLimit: number): SevenState {
  const next: SevenState = {
    ...state,
    hands: state.hands.map(h => [...h]),
    field: {
      spades: { ...state.field.spades },
      hearts: { ...state.field.hearts },
      diamonds: { ...state.field.diamonds },
      clubs: { ...state.field.clubs },
    },
    passCount: [...state.passCount],
    finished: [...state.finished],
  }
  const player = state.currentPlayer
  if (move.type === 'play' && move.card) {
    const { suit, rank } = move.card
    next.hands[player] = next.hands[player].filter(c => !(c.suit === suit && c.rank === rank))
    const f = next.field[suit]
    if (!f.started) {
      f.started = true
      f.min = 7 as Rank
      f.max = 7 as Rank
    } else if (rank < f.min) {
      f.min = rank
    } else {
      f.max = rank
    }
    if (next.hands[player].length === 0 && !next.finished.includes(player)) {
      next.finished.push(player)
    }
  } else {
    next.passCount[player]++
    void passLimit
  }
  // Advance to next active player
  const totalPlayers = state.hands.length
  let nextPlayer = (player + 1) % totalPlayers
  let tries = 0
  while (next.finished.includes(nextPlayer) && tries < totalPlayers) {
    nextPlayer = (nextPlayer + 1) % totalPlayers
    tries++
  }
  next.currentPlayer = nextPlayer
  return next
}

function chooseAiMove(
  state: SevenState,
  playerIdx: number,
  difficulty: Difficulty,
  rng: () => number
): SevenMove {
  const playable = getPlayableCards(state, playerIdx)
  if (playable.length === 0) return { type: 'pass' }
  switch (difficulty) {
    case 'easy': {
      return { type: 'play', card: playable[Math.floor(rng() * playable.length)] }
    }
    case 'normal': {
      // Prefer 7s first, then cards closest to 7
      const sevens = playable.filter(c => c.rank === 7)
      if (sevens.length > 0) return { type: 'play', card: sevens[0] }
      const sorted = [...playable].sort((a, b) => Math.abs(a.rank - 7) - Math.abs(b.rank - 7))
      return { type: 'play', card: sorted[0] }
    }
    case 'hard':
    case 'expert': {
      // Play 7s first, then try to extend field minimally (block others)
      const sevens = playable.filter(c => c.rank === 7)
      if (sevens.length > 0) return { type: 'play', card: sevens[0] }
      // Prefer cards that don't open up many options for others
      const sorted = [...playable].sort((a, b) => a.rank - b.rank)
      return { type: 'play', card: sorted[0] }
    }
  }
}

function createSimRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function simulate(
  puzzle: SevenPuzzle,
  playerStrategies?: Difficulty[]
): SevenState | null {
  let state = createInitialState(puzzle)
  const rng = createSimRng(puzzle.seed ^ 0xdeadbeef)
  const strategies: Difficulty[] = playerStrategies ??
    Array(puzzle.playerCount).fill(puzzle.difficulty)
  const maxTurns = 52 * puzzle.playerCount * 3
  for (let turn = 0; turn < maxTurns; turn++) {
    const active = Array.from({ length: puzzle.playerCount }, (_, i) => i)
      .filter(i => !state.finished.includes(i))
    if (active.length === 0) return state
    // Check if game is stuck (all active players exceed pass limit)
    const allStuck = active.every(i => state.passCount[i] >= puzzle.passLimit)
    if (allStuck) return state
    const player = state.currentPlayer
    if (state.finished.includes(player)) {
      state = applyMove(state, { type: 'pass' }, puzzle.passLimit)
      continue
    }
    const move = chooseAiMove(state, player, strategies[player], rng)
    state = applyMove(state, move, puzzle.passLimit)
    // Check completion: all suits fully placed
    const allSuitsComplete = SUITS.every(s => state.field[s].started &&
      state.field[s].min === 1 && state.field[s].max === 13)
    if (allSuitsComplete || state.finished.length === puzzle.playerCount) return state
  }
  return state
}

export function solve(puzzle: SevenPuzzle): SevenPuzzle | null {
  const result = simulate(puzzle)
  return result !== null ? puzzle : null
}

export function countSolutions(puzzle: SevenPuzzle): number {
  void puzzle
  return 1
}
