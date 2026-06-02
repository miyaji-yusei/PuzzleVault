import { SpiderPuzzle, SpiderState, Card } from './types'
import { dealState, cloneState, isComplete, removeCompleteSets } from './state'

interface Move {
  fromCol: number
  fromIdx: number
  toCol: number
}

function findSameSuitSeqStart(col: Card[], suitCount: 1 | 2 | 4): number {
  if (col.length === 0) return 0
  const topCard = col[col.length - 1]!
  const topSuit = topCard.suit
  let seqStart = col.length - 1
  while (seqStart > 0) {
    const prev = col[seqStart - 1]!
    const curr = col[seqStart]!
    if (!prev.faceUp || prev.rank !== curr.rank + 1) break
    if (suitCount > 1 && prev.suit !== topSuit) break
    seqStart--
  }
  return seqStart
}

function findValidMoves(s: SpiderState, suitCount: 1 | 2 | 4): Move[] {
  const moves: Move[] = []
  const firstEmpty = s.tableau.findIndex(col => col.length === 0)

  for (let fromCol = 0; fromCol < 10; fromCol++) {
    const col = s.tableau[fromCol]!
    if (col.length === 0) continue
    const topCard = col[col.length - 1]!
    if (!topCard.faceUp) continue

    const seqStart = findSameSuitSeqStart(col, suitCount)

    for (let fromIdx = seqStart; fromIdx < col.length; fromIdx++) {
      const card = col[fromIdx]!
      for (let toCol = 0; toCol < 10; toCol++) {
        if (toCol === fromCol) continue
        const dst = s.tableau[toCol]!
        if (dst.length === 0) continue
        const dstTop = dst[dst.length - 1]!
        if (dstTop.faceUp && dstTop.rank === card.rank + 1) {
          moves.push({ fromCol, fromIdx, toCol })
        }
      }
    }

    if (firstEmpty !== -1 && firstEmpty !== fromCol) {
      moves.push({ fromCol, fromIdx: seqStart, toCol: firstEmpty })
    }
  }

  const seen = new Set<string>()
  return moves.filter(m => {
    const k = `${m.fromCol}-${m.fromIdx}-${m.toCol}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function applyMove(s: SpiderState, move: Move): void {
  const cards = s.tableau[move.fromCol]!.splice(move.fromIdx)
  for (const card of cards) s.tableau[move.toCol]!.push({ ...card })
  const src = s.tableau[move.fromCol]!
  if (src.length > 0 && !src[src.length - 1]!.faceUp) {
    src[src.length - 1] = { ...src[src.length - 1]!, faceUp: true }
  }
  removeCompleteSets(s)
}

function dealFromStock(s: SpiderState): void {
  const deal = s.stock.shift()!
  for (let col = 0; col < 10; col++) s.tableau[col]!.push({ ...deal[col]!, faceUp: true })
  removeCompleteSets(s)
}

// Compact numeric hash to avoid expensive string operations in the visited set.
function stateHash(s: SpiderState): number {
  let h = 5381
  for (const col of s.tableau) {
    h = (h * 31 + col.length) | 0
    for (const c of col) {
      const suitOrd = c.suit === 'spades' ? 0 : c.suit === 'hearts' ? 1 : c.suit === 'diamonds' ? 2 : 3
      h = (h * 127 + c.rank + suitOrd * 14 + (c.faceUp ? 56 : 0)) | 0
    }
  }
  h = (h * 31 + s.stock.length) | 0
  return h
}

function evaluate(s: SpiderState, suitCount: 1 | 2 | 4): number {
  let score = s.foundation * 5000

  // Empty columns are extremely valuable
  const emptyCols = s.tableau.filter(col => col.length === 0).length
  score += emptyCols * 200

  // Cross-suit adjacency penalty. For 2-suit each cross-suit break permanently
  // prevents forming a clean same-suit run, so it deserves a much larger penalty.
  const crossSuitPenalty = suitCount === 1 ? 8 : suitCount === 2 ? 80 : 30

  for (const col of s.tableau) {
    if (col.length === 0) continue

    // Measure same-suit run length from the top
    let seqLen = 0
    let seqSuit = ''
    let seqRank = -1
    for (let i = col.length - 1; i >= 0; i--) {
      const c = col[i]!
      if (!c.faceUp) break
      if (seqLen === 0) {
        seqLen = 1; seqSuit = c.suit; seqRank = c.rank
      } else if (c.suit === seqSuit && c.rank === seqRank + 1) {
        seqLen++; seqRank = c.rank
      } else {
        // Face-up card not in sequence — small bonus for being revealed
        score += 3
        break
      }
    }
    // Exponential reward for long same-suit runs
    score += Math.pow(seqLen, 2.5) * 3

    // Cross-suit adjacency penalty
    for (let i = col.length - 1; i > 0; i--) {
      const above = col[i]!
      const below = col[i - 1]!
      if (!above.faceUp || !below.faceUp) break
      if (above.rank + 1 === below.rank && above.suit !== below.suit) {
        score -= crossSuitPenalty
      }
    }

    // Penalty for face-down cards
    for (const c of col) {
      if (!c.faceUp) score -= 14
    }
  }

  // Remaining stock piles mean more disruption ahead
  score -= s.stock.length * 60

  return score
}

function beamSearch(
  initial: SpiderState,
  suitCount: 1 | 2 | 4,
  beamWidth: number,
  maxIter: number
): SpiderState | null {
  const s0 = cloneState(initial)
  removeCompleteSets(s0)
  if (isComplete(s0)) return s0

  // Use a numeric hash set for O(1) lookups (vs O(key_len) for strings)
  const visited = new Set<number>()
  visited.add(stateHash(s0))

  let beam: SpiderState[] = [s0]

  for (let iter = 0; iter < maxIter; iter++) {
    const candidates: [SpiderState, number][] = []

    for (const state of beam) {
      if (isComplete(state)) return state

      const moves = findValidMoves(state, suitCount)

      for (const move of moves) {
        const next = cloneState(state)
        applyMove(next, move)
        const h = stateHash(next)
        if (!visited.has(h)) {
          visited.add(h)
          candidates.push([next, evaluate(next, suitCount)])
        }
      }

      if (state.stock.length > 0) {
        const next = cloneState(state)
        dealFromStock(next)
        const h = stateHash(next)
        if (!visited.has(h)) {
          visited.add(h)
          candidates.push([next, evaluate(next, suitCount)])
        }
      }
    }

    if (candidates.length === 0) break

    candidates.sort((a, b) => b[1] - a[1])
    beam = candidates.slice(0, beamWidth).map(([s]) => s)

    if (isComplete(beam[0]!)) return beam[0]!
  }

  return null
}

// Fast solvability check for generate() Phase-1.
// Uses the SAME beam width as autoSolve to guarantee zero false positives:
// if quickCheck finds a solution, autoSolve (same width, more iterations) will too.
export function quickCheck(
  initial: SpiderState,
  suitCount: 1 | 2 | 4
): SpiderState | null {
  // Width must equal autoSolve width to prevent false positives.
  // Fewer iterations keep each call fast enough for generate()'s timing budget.
  const width = suitCount === 1 ? 8 : 8
  const iter = suitCount === 1 ? 800 : 100
  return beamSearch(initial, suitCount, width, iter)
}

// Accurate solver for solve() / countSolutions() — same beam width as quickCheck
// so any seed quickCheck found will be confirmed here; more iterations finds more seeds.
export function autoSolve(
  initial: SpiderState,
  suitCount: 1 | 2 | 4,
  maxIter = 5000
): SpiderState | null {
  const width = suitCount === 1 ? 8 : 8
  return beamSearch(initial, suitCount, width, maxIter)
}

export function solve(puzzle: SpiderPuzzle): SpiderPuzzle | null {
  const state = dealState(puzzle.seed, puzzle.suitCount)
  const result = autoSolve(state, puzzle.suitCount, 8000)
  return result !== null ? puzzle : null
}

export function countSolutions(puzzle: SpiderPuzzle): number {
  return solve(puzzle) !== null ? 1 : 0
}
