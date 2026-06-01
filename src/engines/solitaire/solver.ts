import { SolitairePuzzle, SolitaireState, Card, Suit } from './types'
import { dealState, cloneState, isComplete } from './state'

const DIFFICULTY_MAX_RESETS: Record<string, number> = {
  easy: 999,
  normal: 3,
  hard: 3,
  expert: 1,
}

function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds'
}

function suitIndex(suit: Suit): number {
  const idx: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 }
  return idx[suit]
}

function canAddToFoundation(foundation: Card[][], card: Card): boolean {
  const fi = suitIndex(card.suit)
  const f = foundation[fi]
  return f.length === 0 ? card.rank === 1 : f[f.length - 1].rank + 1 === card.rank
}

function canPlaceOnColumn(top: Card, card: Card): boolean {
  return top.faceUp && top.rank === card.rank + 1 && isRed(top) !== isRed(card)
}

function makeKey(s: SolitaireState): string {
  const f = s.foundation.map(col => col.length).join(',')
  const t = s.tableau.map(col => {
    const fd = col.filter(c => !c.faceUp).length
    const fu = col.filter(c => c.faceUp).map(c => `${c.suit[0]}${c.rank}`).join('-')
    return `${fd}:${fu}`
  }).join('|')
  const w = s.waste.length > 0
    ? `${s.waste[s.waste.length - 1].suit[0]}${s.waste[s.waste.length - 1].rank}`
    : 'x'
  return `${f}/${t}/${w}/${s.stock.length}/${s.stockResets}`
}

function moveToFoundation(s: SolitaireState): boolean {
  for (let i = 0; i < 7; i++) {
    const col = s.tableau[i]
    if (col.length === 0) continue
    const card = col[col.length - 1]
    if (card.faceUp && canAddToFoundation(s.foundation, card)) {
      s.foundation[suitIndex(card.suit)].push({ ...card })
      col.pop()
      if (col.length > 0 && !col[col.length - 1].faceUp) {
        col[col.length - 1] = { ...col[col.length - 1], faceUp: true }
      }
      return true
    }
  }
  if (s.waste.length > 0) {
    const card = s.waste[s.waste.length - 1]
    if (canAddToFoundation(s.foundation, card)) {
      s.foundation[suitIndex(card.suit)].push({ ...card })
      s.waste.pop()
      return true
    }
  }
  return false
}

function revealFaceDown(s: SolitaireState): boolean {
  for (let i = 0; i < 7; i++) {
    const col = s.tableau[i]
    const firstFaceUp = col.findIndex(c => c.faceUp)
    if (firstFaceUp <= 0) continue
    const stack = col.slice(firstFaceUp)
    const bottom = stack[0]
    for (let j = 0; j < 7; j++) {
      if (j === i) continue
      const dst = s.tableau[j]
      if (dst.length === 0 && bottom.rank === 13) {
        s.tableau[j] = [...dst, ...stack.map(c => ({ ...c }))]
        col.splice(firstFaceUp)
        if (col.length > 0) col[col.length - 1] = { ...col[col.length - 1], faceUp: true }
        return true
      } else if (dst.length > 0) {
        const top = dst[dst.length - 1]
        if (canPlaceOnColumn(top, bottom)) {
          s.tableau[j] = [...dst, ...stack.map(c => ({ ...c }))]
          col.splice(firstFaceUp)
          if (col.length > 0) col[col.length - 1] = { ...col[col.length - 1], faceUp: true }
          return true
        }
      }
    }
  }
  return false
}

function wasteToTableau(s: SolitaireState): boolean {
  if (s.waste.length === 0) return false
  const card = s.waste[s.waste.length - 1]
  for (let i = 0; i < 7; i++) {
    const col = s.tableau[i]
    if (col.length === 0) {
      if (card.rank === 13) {
        col.push({ ...card, faceUp: true })
        s.waste.pop()
        return true
      }
    } else {
      const top = col[col.length - 1]
      if (canPlaceOnColumn(top, card)) {
        col.push({ ...card, faceUp: true })
        s.waste.pop()
        return true
      }
    }
  }
  return false
}

function drawFromStock(s: SolitaireState, drawMode: 1 | 3): boolean {
  if (s.stock.length === 0) return false
  const count = Math.min(drawMode, s.stock.length)
  for (let i = 0; i < count; i++) {
    const card = s.stock.pop()
    if (card) s.waste.push({ ...card, faceUp: true })
  }
  return true
}

function resetStock(s: SolitaireState, maxResets: number): boolean {
  if (s.stock.length > 0 || s.stockResets >= maxResets) return false
  while (s.waste.length > 0) {
    const card = s.waste.pop()
    if (card) s.stock.push({ ...card, faceUp: false })
  }
  s.stockResets++
  return true
}

function anyTableauMove(s: SolitaireState): boolean {
  for (let i = 0; i < 7; i++) {
    const srcCol = s.tableau[i]
    const firstFaceUp = srcCol.findIndex(c => c.faceUp)
    if (firstFaceUp === -1) continue
    for (let start = firstFaceUp; start < srcCol.length; start++) {
      const stack = srcCol.slice(start)
      const bottom = stack[0]
      for (let j = 0; j < 7; j++) {
        if (j === i) continue
        const dst = s.tableau[j]
        if (dst.length === 0 && bottom.rank === 13 && firstFaceUp > 0) {
          s.tableau[j] = [...dst, ...stack.map(c => ({ ...c }))]
          srcCol.splice(start)
          if (srcCol.length > 0) srcCol[srcCol.length - 1] = { ...srcCol[srcCol.length - 1], faceUp: true }
          return true
        } else if (dst.length > 0) {
          const top = dst[dst.length - 1]
          if (canPlaceOnColumn(top, bottom)) {
            s.tableau[j] = [...dst, ...stack.map(c => ({ ...c }))]
            srcCol.splice(start)
            if (srcCol.length > 0) srcCol[srcCol.length - 1] = { ...srcCol[srcCol.length - 1], faceUp: true }
            return true
          }
        }
      }
    }
  }
  return false
}

export function autoSolve(
  initial: SolitaireState,
  drawMode: 1 | 3,
  maxResets: number,
  maxIter = 3000
): SolitaireState | null {
  const s = cloneState(initial)
  const seen = new Set<string>()

  for (let iter = 0; iter < maxIter; iter++) {
    if (isComplete(s)) return s
    const key = makeKey(s)
    if (seen.has(key)) {
      if (!drawFromStock(s, drawMode) && !resetStock(s, maxResets)) return null
      continue
    }
    seen.add(key)
    if (moveToFoundation(s)) continue
    if (revealFaceDown(s)) continue
    if (wasteToTableau(s)) continue
    if (drawFromStock(s, drawMode)) continue
    if (resetStock(s, maxResets)) continue
    if (anyTableauMove(s)) continue
    return null
  }
  return isComplete(s) ? s : null
}

export function solve(puzzle: SolitairePuzzle): SolitairePuzzle | null {
  const maxResets = DIFFICULTY_MAX_RESETS[puzzle.difficulty] ?? 3
  const state = dealState(puzzle.seed, puzzle.drawMode)
  const result = autoSolve(state, puzzle.drawMode, maxResets)
  return result !== null ? puzzle : null
}

export function countSolutions(puzzle: SolitairePuzzle): number {
  return solve(puzzle) !== null ? 1 : 0
}
