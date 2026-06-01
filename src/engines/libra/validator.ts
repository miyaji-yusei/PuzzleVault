import { LibraState, LibraMove, CellValue } from './types'
import { ValidationResult } from '../../types/engine'

export function validate(state: LibraState, move: LibraMove): ValidationResult {
  if (move.value === null) {
    return { correct: false, isComplete: false, lifeLost: false }
  }

  const { row, col, value } = move
  const correct = value === state.solution[row][col]

  if (!correct) {
    return { correct: false, isComplete: false, lifeLost: true }
  }

  // Check if puzzle is complete after this move
  const isComplete = state.current.every((rowArr, r) =>
    rowArr.every((cell, c) => {
      const applied: CellValue = r === row && c === col ? value : cell
      return applied === state.solution[r][c]
    })
  )

  return { correct: true, isComplete, lifeLost: false }
}
