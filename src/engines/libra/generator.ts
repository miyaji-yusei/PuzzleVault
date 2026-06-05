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

const GRID_SIZE = 6

const DIFFICULTY_CONFIG: Record<Difficulty, {
  revealRate: number
  constraintCount: number
}> = {
  easy:   { revealRate: 0.55, constraintCount: 8 },
  normal: { revealRate: 0.38, constraintCount: 5 },
  hard:   { revealRate: 0.22, constraintCount: 3 },
  expert: { revealRate: 0.12, constraintCount: 1 },
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

// Check if puzzle can be solved by constraint propagation alone (no guessing)
function isLogicallySolvable(
  initial: CellValue[][],
  size: number,
  constraints: Constraint[]
): boolean {
  const grid: CellValue[][] = initial.map(row => [...row])

  let changed = true
  while (changed) {
    changed = false
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== null) continue

        const canA = isValid(grid, r, c, 'A', size, constraints)
        const canB = isValid(grid, r, c, 'B', size, constraints)

        if (!canA && !canB) return false
        if (canA && !canB) { grid[r][c] = 'A'; changed = true }
        else if (!canA && canB) { grid[r][c] = 'B'; changed = true }
      }
    }
  }

  return grid.every(row => row.every(v => v !== null))
}

// Count rows/columns where 3 of one value are already revealed (trivially solved line)
function countMaxedLines(initial: CellValue[][], size: number): number {
  const half = size / 2
  let count = 0

  for (let r = 0; r < size; r++) {
    const aCount = initial[r].filter(v => v === 'A').length
    const bCount = initial[r].filter(v => v === 'B').length
    if (aCount >= half || bCount >= half) count++
  }

  for (let c = 0; c < size; c++) {
    const col = Array.from({ length: size }, (_, r) => initial[r][c])
    const aCount = col.filter(v => v === 'A').length
    const bCount = col.filter(v => v === 'B').length
    if (aCount >= half || bCount >= half) count++
  }

  return count
}

function tryGenerate(
  difficulty: Difficulty,
  seed: number,
  requireLogical: boolean
): LibraPuzzle | null {
  const rng = createRng(seed)
  const { revealRate, constraintCount } = DIFFICULTY_CONFIG[difficulty]
  const size = GRID_SIZE

  const solution = generateSolution(size, rng)
  const constraints = generateConstraints(solution, size, constraintCount, rng)

  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push([r, c])
    }
  }
  const shuffledCells = shuffle(cells, rng)

  const initial: CellValue[][] = solution.map(row => [...row])
  const totalCells = size * size
  const targetRevealed = Math.round(totalCells * revealRate)

  for (const [r, c] of shuffledCells) {
    const currentRevealed = initial.flat().filter(v => v !== null).length
    if (currentRevealed <= targetRevealed) break

    const backup = initial[r][c]
    initial[r][c] = null

    const copy: CellValue[][] = initial.map(row => [...row])
    const cnt = countSolutionsInternal(copy, size, constraints)

    if (cnt !== 1) {
      initial[r][c] = backup
    }
  }

  // Reject puzzles with many trivially-solved lines (20% chance of allowing them)
  const maxedLines = countMaxedLines(initial, size)
  if (maxedLines > 0 && rng() > 0.2) return null

  // Require logical solvability (no guessing)
  if (requireLogical && !isLogicallySolvable(initial, size, constraints)) return null

  return {
    id: `libra-${difficulty}-${seed}`,
    size,
    initial,
    solution,
    constraints,
    difficulty,
    seed,
  }
}

export function generate(difficulty: Difficulty, seed?: number): LibraPuzzle {
  const baseSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0

  // Try to generate a logically solvable puzzle without trivial lines
  for (let attempt = 0; attempt < 80; attempt++) {
    const trySeed = (baseSeed + attempt * 999983) >>> 0
    const puzzle = tryGenerate(difficulty, trySeed, true)
    if (puzzle) return { ...puzzle, seed: baseSeed }
  }

  // Fallback: allow guessing puzzles but still avoid trivial lines
  for (let attempt = 0; attempt < 20; attempt++) {
    const trySeed = (baseSeed + (attempt + 80) * 999983) >>> 0
    const puzzle = tryGenerate(difficulty, trySeed, false)
    if (puzzle) return { ...puzzle, seed: baseSeed }
  }

  // Last resort: generate any unique puzzle
  const fallbackSeed = (baseSeed + 100 * 999983) >>> 0
  const rng = createRng(fallbackSeed)
  const size = GRID_SIZE
  const { revealRate, constraintCount } = DIFFICULTY_CONFIG[difficulty]
  const solution = generateSolution(size, rng)
  const constraints = generateConstraints(solution, size, constraintCount, rng)
  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c])
  const shuffledCells = shuffle(cells, rng)
  const initial: CellValue[][] = solution.map(row => [...row])
  const targetRevealed = Math.round(size * size * revealRate)
  for (const [r, c] of shuffledCells) {
    if (initial.flat().filter(v => v !== null).length <= targetRevealed) break
    const backup = initial[r][c]
    initial[r][c] = null
    const copy = initial.map(row => [...row])
    if (countSolutionsInternal(copy, size, constraints) !== 1) initial[r][c] = backup
  }

  return {
    id: `libra-${difficulty}-${baseSeed}`,
    size,
    initial,
    solution,
    constraints,
    difficulty,
    seed: baseSeed,
  }
}

export { solveGrid }
