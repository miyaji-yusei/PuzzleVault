import { SumsState, SumsMove, CellValue } from './types'
import { ValidationResult } from '../../types/engine'

export function validate(state: SumsState, move: SumsMove): ValidationResult {
  const { row, col, value, isNote } = move

  if (isNote) {
    return { correct: true, isComplete: false, lifeLost: false }
  }

  const expected = state.solution[row]?.[col]
  if (expected === undefined || expected === null) {
    return { correct: false, isComplete: false, lifeLost: false }
  }

  if (value !== expected) {
    return { correct: false, isComplete: false, lifeLost: true }
  }

  // Check if all white cells are now filled
  const newCurrent = state.current.map((r, ri) =>
    r.map((v, ci) => (ri === row && ci === col ? value : v))
  )
  const isComplete = newCurrent.every((r, ri) =>
    r.every((v, ci) => {
      const cell = state.grid[ri]?.[ci]
      return cell?.type === 'black' || v !== null
    })
  )

  return { correct: true, isComplete, lifeLost: false }
}
