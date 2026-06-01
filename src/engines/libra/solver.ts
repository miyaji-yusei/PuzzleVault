import { CellValue, Constraint, LibraPuzzle } from './types'

// Check if placing value at (row, col) satisfies all constraints
function checkConstraints(
  grid: CellValue[][],
  row: number,
  col: number,
  value: CellValue,
  constraints: Constraint[]
): boolean {
  for (const c of constraints) {
    let v1: CellValue | undefined
    let v2: CellValue | undefined

    if (c.r1 === row && c.c1 === col) {
      v1 = value
      v2 = grid[c.r2][c.c2]
    } else if (c.r2 === row && c.c2 === col) {
      v1 = grid[c.r1][c.c1]
      v2 = value
    } else {
      continue
    }

    // Only check if both values are known
    if (v1 === null || v2 === null) continue

    if (c.type === 'eq' && v1 !== v2) return false
    if (c.type === 'neq' && v1 === v2) return false
  }
  return true
}

// Check if placing value at (row, col) violates consecutive constraint
function checkConsecutive(
  grid: CellValue[][],
  row: number,
  col: number,
  value: CellValue,
  size: number
): boolean {
  // Check row: no 3 in a row
  // Look at 2 previous columns
  if (col >= 2 && grid[row][col - 1] === value && grid[row][col - 2] === value) return false
  // Look at 1 prev + 1 next
  if (col >= 1 && col < size - 1 && grid[row][col - 1] === value && grid[row][col + 1] === value) return false
  // Look at 2 next columns
  if (col < size - 2 && grid[row][col + 1] === value && grid[row][col + 2] === value) return false

  // Check column: no 3 in a column
  if (row >= 2 && grid[row - 1][col] === value && grid[row - 2][col] === value) return false
  if (row >= 1 && row < size - 1 && grid[row - 1][col] === value && grid[row + 1][col] === value) return false
  if (row < size - 2 && grid[row + 1][col] === value && grid[row + 2][col] === value) return false

  return true
}

// Check balance constraints for the row/col when placing value
function checkBalance(
  grid: CellValue[][],
  row: number,
  col: number,
  value: CellValue,
  size: number
): boolean {
  const half = size / 2

  // Check row balance
  let rowA = 0
  let rowB = 0
  let rowEmpty = 0
  for (let c = 0; c < size; c++) {
    const v = c === col ? value : grid[row][c]
    if (v === 'A') rowA++
    else if (v === 'B') rowB++
    else rowEmpty++
  }
  if (rowA > half || rowB > half) return false
  // If row is now complete, must be exactly half
  if (rowEmpty === 0 && (rowA !== half || rowB !== half)) return false

  // Check col balance
  let colA = 0
  let colB = 0
  let colEmpty = 0
  for (let r = 0; r < size; r++) {
    const v = r === row ? value : grid[r][col]
    if (v === 'A') colA++
    else if (v === 'B') colB++
    else colEmpty++
  }
  if (colA > half || colB > half) return false
  if (colEmpty === 0 && (colA !== half || colB !== half)) return false

  return true
}

// Check uniqueness constraint for completed rows/cols
function checkUniqueness(
  grid: CellValue[][],
  row: number,
  col: number,
  value: CellValue,
  size: number
): boolean {
  // Check if placing value completes the row
  let rowComplete = true
  const newRow: CellValue[] = []
  for (let c = 0; c < size; c++) {
    const v = c === col ? value : grid[row][c]
    newRow.push(v)
    if (v === null) { rowComplete = false; break }
  }

  if (rowComplete) {
    for (let r = 0; r < size; r++) {
      if (r === row) continue
      const rowDone = grid[r].every(v => v !== null)
      if (!rowDone) continue
      if (grid[r].every((v, c) => v === newRow[c])) return false
    }
  }

  // Check if placing value completes the column
  let colComplete = true
  const newCol: CellValue[] = []
  for (let r = 0; r < size; r++) {
    const v = r === row ? value : grid[r][col]
    newCol.push(v)
    if (v === null) { colComplete = false; break }
  }

  if (colComplete) {
    for (let c = 0; c < size; c++) {
      if (c === col) continue
      const colDone = Array.from({ length: size }, (_, r) => grid[r][c]).every(v => v !== null)
      if (!colDone) continue
      const colVals = Array.from({ length: size }, (_, r) => grid[r][c])
      if (colVals.every((v, r) => v === newCol[r])) return false
    }
  }

  return true
}

// Check if a placement is valid given current grid state
function isValid(
  grid: CellValue[][],
  row: number,
  col: number,
  value: CellValue,
  size: number,
  constraints: Constraint[]
): boolean {
  return (
    checkConsecutive(grid, row, col, value, size) &&
    checkBalance(grid, row, col, value, size) &&
    checkUniqueness(grid, row, col, value, size) &&
    checkConstraints(grid, row, col, value, constraints)
  )
}

// Find next empty cell using MRV heuristic
function findNextEmpty(grid: CellValue[][], size: number): [number, number] | null {
  let bestRow = -1
  let bestCol = -1
  let bestOptions = 3

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) {
        let options = 0
        if (isValid(grid, r, c, 'A', size, [])) options++
        if (isValid(grid, r, c, 'B', size, [])) options++
        if (options < bestOptions) {
          bestOptions = options
          bestRow = r
          bestCol = c
          if (options === 0) return [bestRow, bestCol]
        }
      }
    }
  }

  return bestRow === -1 ? null : [bestRow, bestCol]
}

// Find next empty cell using MRV heuristic with constraints
function findNextEmptyWithConstraints(
  grid: CellValue[][],
  size: number,
  constraints: Constraint[]
): [number, number] | null {
  let bestRow = -1
  let bestCol = -1
  let bestOptions = 3

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) {
        let options = 0
        if (isValid(grid, r, c, 'A', size, constraints)) options++
        if (isValid(grid, r, c, 'B', size, constraints)) options++
        if (options < bestOptions) {
          bestOptions = options
          bestRow = r
          bestCol = c
          if (options === 0) return [bestRow, bestCol]
        }
      }
    }
  }

  return bestRow === -1 ? null : [bestRow, bestCol]
}

// Solve grid using backtracking with constraint propagation
function solveGrid(
  grid: CellValue[][],
  size: number,
  constraints: Constraint[]
): boolean {
  const cell = findNextEmptyWithConstraints(grid, size, constraints)
  if (cell === null) return true

  const [row, col] = cell
  for (const value of ['A', 'B'] as CellValue[]) {
    if (isValid(grid, row, col, value, size, constraints)) {
      grid[row][col] = value
      if (solveGrid(grid, size, constraints)) return true
      grid[row][col] = null
    }
  }
  return false
}

// Count solutions (cap at 2 for efficiency)
function countHelper(
  grid: CellValue[][],
  size: number,
  constraints: Constraint[],
  count: { value: number }
): void {
  if (count.value > 1) return

  const cell = findNextEmpty(grid, size)
  if (cell === null) {
    count.value++
    return
  }

  const [row, col] = cell
  for (const value of ['A', 'B'] as CellValue[]) {
    if (isValid(grid, row, col, value, size, constraints)) {
      grid[row][col] = value
      countHelper(grid, size, constraints, count)
      grid[row][col] = null
    }
  }
}

export function solve(puzzle: LibraPuzzle): LibraPuzzle | null {
  const grid: CellValue[][] = puzzle.initial.map(row => [...row])
  if (solveGrid(grid, puzzle.size, puzzle.constraints)) {
    return { ...puzzle, initial: grid }
  }
  return null
}

export function countSolutions(puzzle: LibraPuzzle): number {
  const grid: CellValue[][] = puzzle.initial.map(row => [...row])
  const count = { value: 0 }
  countHelper(grid, puzzle.size, puzzle.constraints, count)
  return count.value
}

export { isValid, solveGrid }
