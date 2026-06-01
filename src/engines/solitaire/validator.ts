import { SolitaireState, SolitaireMove, Card, Suit } from './types'
import { ValidationResult } from '../../types/engine'

function isRed(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds'
}

function suitIndex(suit: Suit): number {
  const idx: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 }
  return idx[suit]
}

function canPlaceOnColumn(top: Card, card: Card): boolean {
  return top.faceUp && top.rank === card.rank + 1 && isRed(top) !== isRed(card)
}

function canAddToFoundation(foundation: Card[][], card: Card): boolean {
  const fi = suitIndex(card.suit)
  const f = foundation[fi]
  return f.length === 0 ? card.rank === 1 : f[f.length - 1].rank + 1 === card.rank
}

function checkComplete(state: SolitaireState): boolean {
  return state.foundation.reduce((sum, f) => sum + f.length, 0) === 52
}

export function validate(state: SolitaireState, move: SolitaireMove): ValidationResult {
  switch (move.type) {
    case 'stock-draw':
      return { correct: state.stock.length > 0, isComplete: false, lifeLost: false }

    case 'stock-reset':
      return {
        correct: state.stock.length === 0 && state.waste.length > 0,
        isComplete: false,
        lifeLost: false,
      }

    case 'tableau-to-foundation': {
      if (!move.from) return { correct: false, isComplete: false, lifeLost: false }
      const col = state.tableau[move.from.index]
      if (!col || col.length === 0) return { correct: false, isComplete: false, lifeLost: false }
      const card = col[col.length - 1]
      const correct = card.faceUp && canAddToFoundation(state.foundation, card)
      const isComplete = correct && checkComplete(state)
      return { correct, isComplete, lifeLost: false }
    }

    case 'waste-to-foundation': {
      if (state.waste.length === 0) return { correct: false, isComplete: false, lifeLost: false }
      const card = state.waste[state.waste.length - 1]
      const correct = canAddToFoundation(state.foundation, card)
      const isComplete = correct && checkComplete(state)
      return { correct, isComplete, lifeLost: false }
    }

    case 'tableau-to-tableau': {
      if (!move.from || !move.to) return { correct: false, isComplete: false, lifeLost: false }
      const srcCol = state.tableau[move.from.index]
      const dstCol = state.tableau[move.to.index]
      const cardIdx = move.from.cardIndex ?? (srcCol.length - 1)
      if (cardIdx < 0 || cardIdx >= srcCol.length) return { correct: false, isComplete: false, lifeLost: false }
      const card = srcCol[cardIdx]
      if (!card || !card.faceUp) return { correct: false, isComplete: false, lifeLost: false }
      const correct = dstCol.length === 0
        ? card.rank === 13
        : canPlaceOnColumn(dstCol[dstCol.length - 1], card)
      return { correct, isComplete: false, lifeLost: false }
    }

    case 'waste-to-tableau': {
      if (!move.to || state.waste.length === 0) return { correct: false, isComplete: false, lifeLost: false }
      const card = state.waste[state.waste.length - 1]
      const dstCol = state.tableau[move.to.index]
      const correct = dstCol.length === 0
        ? card.rank === 13
        : canPlaceOnColumn(dstCol[dstCol.length - 1], card)
      return { correct, isComplete: false, lifeLost: false }
    }

    default:
      return { correct: false, isComplete: false, lifeLost: false }
  }
}
