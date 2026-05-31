import { PandaState, PandaMove } from './types'
import { ValidationResult } from '../../types/engine'

export function validate(state: PandaState, move: PandaMove): ValidationResult {
  const { row, col, value } = move

  // Apply the move tentatively to check correctness
  const solutionCell = state.solution[row][col]
  // 'crossed' is a valid marking for cells that should be 'empty' in the solution
  const correct =
    value === solutionCell ||
    (value === 'crossed' && solutionCell === 'empty')

  if (!correct) {
    return { correct: false, isComplete: false, lifeLost: true }
  }

  // Check if the puzzle is complete after this move
  const isComplete = state.current.every((rowArr, r) =>
    rowArr.every((cell, c) => {
      const applied = r === row && c === col ? value : cell
      const sol = state.solution[r][c]
      // A cells are always fixed and not user-placed
      if (sol === 'A') return true
      // empty solution cells should be 'empty' or 'crossed' in current
      if (sol === 'empty') return applied === 'empty' || applied === 'crossed'
      return applied === sol
    })
  )

  return { correct: true, isComplete, lifeLost: false }
}
