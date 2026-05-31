import { Board, Cell, SudokuPuzzle } from './types'

function isValidPlacement(board: Board, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) return false
  }
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) return false
  }
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) return false
    }
  }
  return true
}

// MRV（最少残余値）ヒューリスティック：選択肢が最も少ない空きセルを選ぶ
function findBestEmpty(board: Board): [number, number] | null {
  let bestRow = -1
  let bestCol = -1
  let bestCount = 10

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        let count = 0
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(board, r, c, n)) count++
        }
        if (count < bestCount) {
          bestCount = count
          bestRow = r
          bestCol = c
          if (count === 0) return [bestRow, bestCol]
        }
      }
    }
  }

  return bestRow === -1 ? null : [bestRow, bestCol]
}

function solveBoard(board: Board): boolean {
  const cell = findBestEmpty(board)
  if (cell === null) return true

  const [row, col] = cell
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num as Cell
      if (solveBoard(board)) return true
      board[row][col] = null
    }
  }
  return false
}

export function solve(puzzle: SudokuPuzzle): SudokuPuzzle | null {
  const board: Board = puzzle.board.map(row => [...row] as Cell[])
  if (solveBoard(board)) {
    return { ...puzzle, board }
  }
  return null
}

function countHelper(board: Board, count: { value: number }): void {
  if (count.value > 1) return

  const cell = findBestEmpty(board)
  if (cell === null) {
    count.value++
    return
  }

  const [row, col] = cell
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, row, col, num)) {
      board[row][col] = num as Cell
      countHelper(board, count)
      board[row][col] = null
    }
  }
}

export function countSolutions(puzzle: SudokuPuzzle): number {
  const board: Board = puzzle.board.map(row => [...row] as Cell[])
  const count = { value: 0 }
  countHelper(board, count)
  return count.value
}
