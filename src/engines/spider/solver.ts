import { SpiderPuzzle, SpiderState, Card } from './types'
import { dealState, cloneState, isComplete, removeCompleteSets } from './state'

interface Move {
  fromCol: number
  fromIdx: number
  toCol: number
}

function makeKey(s: SpiderState): string {
  const t = s.tableau.map(col => {
    const fd = col.filter(c => !c.faceUp).length
    const fu = col.filter(c => c.faceUp).map(c => `${c.suit[0]}${c.rank}`).join('-')
    return `${fd}:${fu}`
  }).join('|')
  return `${s.foundation}/${t}/${s.stock.length}`
}

function isSameSuitDescending(cards: Card[]): boolean {
  if (cards.length <= 1) return true
  const suit = cards[0]!.suit
  for (let i = 0; i < cards.length; i++) {
    if (cards[i]!.suit !== suit) return false
    if (i < cards.length - 1 && cards[i]!.rank !== cards[i + 1]!.rank + 1) return false
  }
  return true
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
    const col = s.tableau[fromCol]
    if (col.length === 0) continue
    const topCard = col[col.length - 1]
    if (!topCard || !topCard.faceUp) continue

    const seqStart = findSameSuitSeqStart(col, suitCount)

    for (let fromIdx = seqStart; fromIdx < col.length; fromIdx++) {
      const card = col[fromIdx]!
      for (let toCol = 0; toCol < 10; toCol++) {
        if (toCol === fromCol) continue
        const dst = s.tableau[toCol]
        if (dst.length === 0) continue
        const dstTop = dst[dst.length - 1]!
        if (dstTop.faceUp && dstTop.rank === card.rank + 1) {
          moves.push({ fromCol, fromIdx, toCol })
        }
      }
    }

    // 空き列への移動（最初の空き列のみ）
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

function scoreMove(s: SpiderState, move: Move): number {
  let score = 0
  const srcCol = s.tableau[move.fromCol]
  const dstCol = s.tableau[move.toCol]
  const seq = srcCol.slice(move.fromIdx)
  const bottomCard = seq[0]!

  // 裏向きカードを表にする
  if (move.fromIdx > 0 && !srcCol[move.fromIdx - 1]!.faceUp) {
    score += 200
  }

  if (dstCol.length > 0) {
    const dstTop = dstCol[dstCol.length - 1]!
    if (dstTop.suit === bottomCard.suit) {
      // 同スートへの配置
      score += 80 + seq.length * 8
    } else {
      score += 10
    }
  } else {
    // 空き列への移動（コストあり）
    score -= 20
  }

  // 同スートシーケンスへのボーナス
  if (isSameSuitDescending(seq)) score += 15 * seq.length

  return score
}

function applyMove(s: SpiderState, move: Move): void {
  const cards = s.tableau[move.fromCol].splice(move.fromIdx)
  for (const card of cards) s.tableau[move.toCol].push({ ...card })
  const src = s.tableau[move.fromCol]
  if (src.length > 0 && !src[src.length - 1]!.faceUp) {
    src[src.length - 1] = { ...src[src.length - 1]!, faceUp: true }
  }
  removeCompleteSets(s)
}

export function autoSolve(
  initial: SpiderState,
  suitCount: 1 | 2 | 4,
  maxIter = 3000
): SpiderState | null {
  const s = cloneState(initial)
  removeCompleteSets(s)
  const seen = new Set<string>()

  for (let iter = 0; iter < maxIter; iter++) {
    if (isComplete(s)) return s

    const key = makeKey(s)
    if (seen.has(key)) {
      if (s.stock.length === 0 || s.tableau.some(col => col.length === 0)) return null
      const deal = s.stock.shift()!
      for (let col = 0; col < 10; col++) s.tableau[col].push({ ...deal[col]!, faceUp: true })
      removeCompleteSets(s)
      seen.clear()
      continue
    }
    seen.add(key)

    const moves = findValidMoves(s, suitCount)
    if (moves.length === 0) {
      if (s.stock.length === 0 || s.tableau.some(col => col.length === 0)) return null
      const deal = s.stock.shift()!
      for (let col = 0; col < 10; col++) s.tableau[col].push({ ...deal[col]!, faceUp: true })
      removeCompleteSets(s)
      seen.clear()
      continue
    }

    let bestMove = moves[0]!
    let bestScore = scoreMove(s, moves[0]!)
    for (const m of moves.slice(1)) {
      const sc = scoreMove(s, m)
      if (sc > bestScore) { bestScore = sc; bestMove = m }
    }
    applyMove(s, bestMove)
  }

  return isComplete(s) ? s : null
}

export function solve(puzzle: SpiderPuzzle): SpiderPuzzle | null {
  const state = dealState(puzzle.seed, puzzle.suitCount)
  const result = autoSolve(state, puzzle.suitCount, 5000)
  return result !== null ? puzzle : null
}

export function countSolutions(puzzle: SpiderPuzzle): number {
  return solve(puzzle) !== null ? 1 : 0
}
