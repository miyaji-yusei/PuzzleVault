import { Board, Cell, SudokuPuzzle } from './types'
import { Difficulty } from '../../types/engine'

// mulberry32 シードベース疑似乱数生成器
function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

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

function fillBoard(board: Board, rng: () => number): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
        for (const num of nums) {
          if (isValidPlacement(board, r, c, num)) {
            board[r][c] = num as Cell
            if (fillBoard(board, rng)) return true
            board[r][c] = null
          }
        }
        return false
      }
    }
  }
  return true
}

// MRV ヒューリスティックで空きセルを選択し、解の個数を数える（2以上で打ち切り）
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

function countUnique(board: Board, count: { value: number }): void {
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
      countUnique(board, count)
      board[row][col] = null
    }
  }
}

const DIFFICULTY_GIVENS: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  normal: [32, 39],
  hard: [26, 31],
  expert: [20, 25],
}

export function generate(difficulty: Difficulty, seed?: number): SudokuPuzzle {
  const actualSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const rng = createRng(actualSeed)

  const emptyBoard: Board = Array.from({ length: 9 }, () =>
    Array(9).fill(null) as Cell[]
  )
  fillBoard(emptyBoard, rng)
  const solution: Board = emptyBoard.map(row => [...row] as Cell[])

  const [minGivens, maxGivens] = DIFFICULTY_GIVENS[difficulty]
  const targetGivens = minGivens + Math.floor(rng() * (maxGivens - minGivens + 1))

  const cells: [number, number][] = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cells.push([r, c])
    }
  }

  const shuffledCells = shuffle(cells, rng)
  const puzzle: Board = emptyBoard.map(row => [...row] as Cell[])
  let givenCount = 81

  for (const [r, c] of shuffledCells) {
    if (givenCount <= targetGivens) break

    const backup = puzzle[r][c]
    puzzle[r][c] = null

    const copy: Board = puzzle.map(row => [...row] as Cell[])
    const count = { value: 0 }
    countUnique(copy, count)

    if (count.value === 1) {
      givenCount--
    } else {
      puzzle[r][c] = backup
    }
  }

  return {
    id: `sudoku-${difficulty}-${actualSeed}`,
    board: puzzle,
    solution,
    difficulty,
    seed: actualSeed,
  }
}
