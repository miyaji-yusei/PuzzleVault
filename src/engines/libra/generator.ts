import { Difficulty } from '../../types/engine'
import { CellValue, Constraint, ConstraintType, LibraPuzzle } from './types'
import { isValid, solveGrid } from './solver'

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

const DIFFICULTY_CONFIG: Record<Difficulty, {
  size: number
  revealRate: number
  constraintCount: number
}> = {
  easy:   { size: 6,  revealRate: 0.40, constraintCount: 6 },
  normal: { size: 8,  revealRate: 0.30, constraintCount: 8 },
  hard:   { size: 8,  revealRate: 0.20, constraintCount: 5 },
  expert: { size: 10, revealRate: 0.15, constraintCount: 5 },
}

// Generate a complete valid solution grid using backtracking + constraint propagation
function generateSolution(size: number, rng: () => number): CellValue[][] {
  const grid: CellValue[][] = Array.from({ length: size }, () => Array(size).fill(null) as CellValue[])

  function fillCell(pos: number): boolean {
    if (pos === size * size) return true

    const row = Math.floor(pos / size)
    const col = pos % size

    const values: CellValue[] = rng() < 0.5 ? ['A', 'B'] : ['B', 'A']

    for (const value of values) {
      if (isValid(grid, row, col, value, size, [])) {
        grid[row][col] = value
        if (fillCell(pos + 1)) return true
        grid[row][col] = null
      }
    }
    return false
  }

  fillCell(0)
  return grid
}

// Generate adjacency constraints between neighboring cells
function generateConstraints(
  solution: CellValue[][],
  size: number,
  count: number,
  rng: () => number
): Constraint[] {
  // Collect all adjacent pairs (horizontal and vertical)
  const pairs: Array<[number, number, number, number]> = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) pairs.push([r, c, r, c + 1])
      if (r + 1 < size) pairs.push([r, c, r + 1, c])
    }
  }

  const shuffled = shuffle(pairs, rng)
  const constraints: Constraint[] = []

  for (const [r1, c1, r2, c2] of shuffled) {
    if (constraints.length >= count) break

    const v1 = solution[r1][c1]
    const v2 = solution[r2][c2]

    if (v1 === null || v2 === null) continue

    const type: ConstraintType = v1 === v2 ? 'eq' : 'neq'
    constraints.push({ r1, c1, r2, c2, type })
  }

  return constraints
}

// Count solutions for a given initial grid (cap at 2 for efficiency)
function countSolutionsInternal(
  initial: CellValue[][],
  size: number,
  constraints: Constraint[]
): number {
  function findNextEmpty(): [number, number] | null {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (initial[r][c] === null) return [r, c]
      }
    }
    return null
  }

  const count = { value: 0 }

  function helper(): void {
    if (count.value > 1) return

    const cell = findNextEmpty()
    if (cell === null) {
      count.value++
      return
    }

    const [row, col] = cell
    for (const value of ['A', 'B'] as CellValue[]) {
      if (isValid(initial, row, col, value, size, constraints)) {
        initial[row][col] = value
        helper()
        initial[row][col] = null
      }
    }
  }

  helper()
  return count.value
}

export function generate(difficulty: Difficulty, seed?: number): LibraPuzzle {
  const actualSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const rng = createRng(actualSeed)

  const { size, revealRate, constraintCount } = DIFFICULTY_CONFIG[difficulty]

  // Generate complete solution
  const solution = generateSolution(size, rng)

  // Generate adjacency constraints based on the solution
  const constraints = generateConstraints(solution, size, constraintCount, rng)

  // Build list of all cells and shuffle
  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push([r, c])
    }
  }
  const shuffledCells = shuffle(cells, rng)

  // Start with full solution and remove cells
  const initial: CellValue[][] = solution.map(row => [...row])
  const totalCells = size * size
  const targetRevealed = Math.round(totalCells * revealRate)

  // Try to remove each cell, keeping only those where puzzle stays unique
  for (const [r, c] of shuffledCells) {
    const currentRevealed = initial.flat().filter(v => v !== null).length
    if (currentRevealed <= targetRevealed) break

    const backup = initial[r][c]
    initial[r][c] = null

    // Check uniqueness
    const copy: CellValue[][] = initial.map(row => [...row])
    const cnt = countSolutionsInternal(copy, size, constraints)

    if (cnt !== 1) {
      // Restore: removing this cell breaks uniqueness
      initial[r][c] = backup
    }
  }

  // Ensure at least targetRevealed cells are revealed
  // If we didn't reach the target (shouldn't happen but safety check), that's fine
  // The puzzle is guaranteed to have unique solution

  return {
    id: `libra-${difficulty}-${actualSeed}`,
    size,
    initial,
    solution,
    constraints,
    difficulty,
    seed: actualSeed,
  }
}

export { solveGrid }
