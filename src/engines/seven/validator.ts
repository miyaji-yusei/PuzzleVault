import { SevenState, SevenMove } from './types'
import { ValidationResult } from '../../types/engine'
import { getPlayableCards } from './solver'

export function validate(state: SevenState, move: SevenMove): ValidationResult {
  const player = state.currentPlayer
  if (move.type === 'pass') {
    const playable = getPlayableCards(state, player)
    const correct = playable.length === 0
    return { correct, isComplete: false, lifeLost: !correct }
  }
  if (!move.card) return { correct: false, isComplete: false, lifeLost: false }
  const { suit, rank } = move.card
  const inHand = state.hands[player].some(c => c.suit === suit && c.rank === rank)
  if (!inHand) return { correct: false, isComplete: false, lifeLost: false }
  const f = state.field[suit]
  let canPlay: boolean
  if (!f.started) {
    canPlay = rank === 7
  } else {
    canPlay = (f.min > 1 && rank === (f.min - 1)) ||
              (f.max < 13 && rank === (f.max + 1))
  }
  if (!canPlay) return { correct: false, isComplete: false, lifeLost: true }
  // Check if this would complete the game
  const remainingAfter = state.hands[player].filter(c => !(c.suit === suit && c.rank === rank)).length
  const isComplete = remainingAfter === 0 && state.finished.length + 1 === state.hands.length
  return { correct: true, isComplete, lifeLost: false }
}
