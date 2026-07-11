import { SpiderState, SpiderMove, Card } from './types'
import { ValidationResult } from '../../types/engine'

function isDescendingSequence(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i]!.rank !== cards[i + 1]!.rank + 1) return false
  }
  return true
}

function isSameSuit(cards: Card[]): boolean {
  if (cards.length <= 1) return true
  const suit = cards[0]!.suit
  return cards.every(c => c.suit === suit)
}

export function isValidMoveUnit(cards: Card[]): boolean {
  if (cards.length === 0) return false
  if (!cards[0]!.faceUp) return false
  if (cards.length === 1) return true
  return isDescendingSequence(cards) && isSameSuit(cards)
}

export function validate(state: SpiderState, move: SpiderMove): ValidationResult {
  switch (move.type) {
    case 'deal': {
      const hasEmpty = state.tableau.some(col => col.length === 0)
      if (hasEmpty || state.stock.length === 0) {
        return { correct: false, isComplete: false, lifeLost: false }
      }
      return { correct: true, isComplete: false, lifeLost: false }
    }

    case 'move': {
      const from = move.from
      const to = move.to
      if (!from || to === undefined) {
        return { correct: false, isComplete: false, lifeLost: false }
      }
      const { col: fromCol, cardIndex: fromIdx } = from
      const { col: toCol } = to

      if (fromCol === toCol) return { correct: false, isComplete: false, lifeLost: false }

      const srcCol = state.tableau[fromCol]
      if (!srcCol || srcCol.length === 0) return { correct: false, isComplete: false, lifeLost: false }
      if (fromIdx < 0 || fromIdx >= srcCol.length) return { correct: false, isComplete: false, lifeLost: false }

      const movingCard = srcCol[fromIdx]!
      if (!movingCard.faceUp) return { correct: false, isComplete: false, lifeLost: true }

      const seq = srcCol.slice(fromIdx)
      if (!isDescendingSequence(seq)) return { correct: false, isComplete: false, lifeLost: true }
      // 複数枚移動は同スートのみ
      if (seq.length > 1 && !isSameSuit(seq)) {
        return { correct: false, isComplete: false, lifeLost: true }
      }

      const dstCol = state.tableau[toCol]
      if (!dstCol) return { correct: false, isComplete: false, lifeLost: false }

      if (dstCol.length > 0) {
        const dstTop = dstCol[dstCol.length - 1]!
        if (!dstTop.faceUp || dstTop.rank !== movingCard.rank + 1) {
          return { correct: false, isComplete: false, lifeLost: true }
        }
      }

      return { correct: true, isComplete: state.foundation === 8, lifeLost: false }
    }

    case 'undo':
      return { correct: true, isComplete: false, lifeLost: false }

    default:
      return { correct: false, isComplete: false, lifeLost: false }
  }
}
