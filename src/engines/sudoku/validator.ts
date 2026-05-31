import { SudokuState, SudokuMove } from './types'
import { ValidationResult } from '../../types/engine'

export function validate(state: SudokuState, move: SudokuMove): ValidationResult {
  if (move.isNote) {
    return { correct: true, isComplete: false, lifeLost: false }
  }

  if (move.value === null) {
    return { correct: false, isComplete: false, lifeLost: false }
  }

  const { row, col, value } = move
  const correct = value === state.solution[row][col]

  if (!correct) {
    return { correct: false, isComplete: false, lifeLost: true }
  }

  const isComplete = state.current.every((rowArr, r) =>
    rowArr.every((cell, c) => {
      const applied = r === row && c === col ? value : cell
      return applied === state.solution[r][c]
    })
  )

  return { correct: true, isComplete, lifeLost: false }
}
