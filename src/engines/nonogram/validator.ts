import { NonogramState, NonogramMove } from './types'
import { ValidationResult } from '../../types/engine'

export function validate(state: NonogramState, move: NonogramMove): ValidationResult {
  const { row, col, state: cellState } = move
  const expected = state.solution[row][col]

  if (cellState === 'crossed') {
    // ×マークは空白セルへの操作: 正解は塗らないマス
    const correct = !expected
    if (!correct) {
      return { correct: false, isComplete: false, lifeLost: true }
    }
    const isComplete = checkComplete(state, row, col, false)
    return { correct: true, isComplete, lifeLost: false }
  }

  if (cellState === 'filled') {
    const correct = expected === true
    if (!correct) {
      return { correct: false, isComplete: false, lifeLost: true }
    }
    const isComplete = checkComplete(state, row, col, true)
    return { correct: true, isComplete, lifeLost: false }
  }

  // 'empty' = 消去操作は常に正解扱い
  return { correct: true, isComplete: false, lifeLost: false }
}

function checkComplete(state: NonogramState, changedRow: number, changedCol: number, changedValue: boolean): boolean {
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const current = r === changedRow && c === changedCol
        ? changedValue
        : state.current[r][c] === 'filled'
      if (current !== state.solution[r][c]) return false
    }
  }
  return true
}
