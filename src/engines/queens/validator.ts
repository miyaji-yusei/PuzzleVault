import { QueensState, QueensMove } from './types'
import { ValidationResult } from '../../types/engine'

/**
 * クイーンズパズルの手（ムーブ）を検証する
 */
export function validate(state: QueensState, move: QueensMove): ValidationResult {
  const { row, col, state: newCellState } = move
  const { size, solution } = state

  // crossed は常に正当（ユーザーのメモ操作）
  if (newCellState === 'crossed') {
    return { correct: true, isComplete: false, lifeLost: false }
  }

  // empty への変更（消去操作）は常に正当
  if (newCellState === 'empty') {
    return { correct: true, isComplete: false, lifeLost: false }
  }

  // queen を置く場合：正解かチェック
  const correct = solution[row][col] === true

  if (!correct) {
    return { correct: false, isComplete: false, lifeLost: true }
  }

  // 全クイーンが正しく配置されているか確認
  const nextCurrent = state.current.map(r => [...r])
  nextCurrent[row][col] = 'queen'

  let queenCount = 0
  let correctQueens = 0

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (solution[r][c]) {
        queenCount++
        if (nextCurrent[r][c] === 'queen') {
          correctQueens++
        }
      }
    }
  }

  const isComplete = correctQueens === queenCount && queenCount === size

  return { correct: true, isComplete, lifeLost: false }
}
