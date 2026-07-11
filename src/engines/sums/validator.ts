import { SumsState, SumsMove } from './types'
import { ValidationResult } from '../../types/engine'

export function validate(state: SumsState, move: SumsMove): ValidationResult {
  const { row, col, mark } = move
  const expected = state.solution[row]?.[col]

  if (expected === undefined) {
    return { correct: false, isComplete: false, lifeLost: false }
  }

  const correct = mark === null || mark === expected
  if (!correct) {
    return { correct: false, isComplete: false, lifeLost: true }
  }

  // Check if all cells are correctly marked
  const isComplete = state.solution.every((sRow, r) =>
    sRow.every((expectedMark, c) => {
      const currentMark = r === row && c === col ? mark : state.current[r]?.[c]
      return currentMark === expectedMark
    })
  )

  return { correct: true, isComplete, lifeLost: false }
}
