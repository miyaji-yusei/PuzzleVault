import { Difficulty, CellContent, CellFixed, PandaPuzzle } from './types'
import { countSolutions } from './solver'

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

// Check if placing B at (row, col) violates the B-adjacency constraint (8 directions)
function isBAdjacentSafe(
  grid: CellContent[][],
  row: number,
  col: number,
  size: number
): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (grid[nr][nc] === 'B') return false
      }
    }
  }
  return true
}

// Get orthogonal neighbors of (row, col)
function getOrthogonalNeighbors(
  row: number,
  col: number,
  size: number
): [number, number][] {
  const neighbors: [number, number][] = []
  if (row > 0) neighbors.push([row - 1, col])
  if (row < size - 1) neighbors.push([row + 1, col])
  if (col > 0) neighbors.push([row, col - 1])
  if (col < size - 1) neighbors.push([row, col + 1])
  return neighbors
}

// Place A cells on the grid using backtracking
function placeAs(
  fixed: CellFixed[][],
  size: number,
  count: number,
  rng: () => number
): boolean {
  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push([r, c])
    }
  }
  const shuffled = shuffle(cells, rng)

  let placed = 0
  for (const [r, c] of shuffled) {
    if (placed >= count) break
    fixed[r][c] = 'A'
    placed++
  }
  return placed === count
}

// Assign a B to each A using backtracking, respecting B-adjacency constraint
function assignBs(
  fixed: CellFixed[][],
  grid: CellContent[][],
  size: number,
  pandaCells: [number, number][],
  idx: number,
  rng: () => number
): boolean {
  if (idx === pandaCells.length) return true

  const [pr, pc] = pandaCells[idx]
  const neighbors = getOrthogonalNeighbors(pr, pc, size)
  const shuffled = shuffle(neighbors, rng)

  for (const [nr, nc] of shuffled) {
    if (grid[nr][nc] !== 'empty') continue
    if (!isBAdjacentSafe(grid, nr, nc, size)) continue

    grid[nr][nc] = 'B'
    if (assignBs(fixed, grid, size, pandaCells, idx + 1, rng)) return true
    grid[nr][nc] = 'empty'
  }

  return false
}

const DIFFICULTY_CONFIG: Record<Difficulty, { size: number; minA: number; maxA: number }> = {
  easy: { size: 4, minA: 4, maxA: 5 },
  normal: { size: 6, minA: 6, maxA: 8 },
  hard: { size: 7, minA: 7, maxA: 10 },
  expert: { size: 8, minA: 10, maxA: 14 },
}

export function generate(difficulty: Difficulty, seed?: number): PandaPuzzle {
  const actualSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const config = DIFFICULTY_CONFIG[difficulty]

  const MAX_ATTEMPTS = 50

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Use a derived seed per attempt so each attempt is deterministic but different
    const attemptSeed = (actualSeed + attempt * 0x9e3779b9) >>> 0
    const rng = createRng(attemptSeed)

    const { size, minA, maxA } = config
    const numA = minA + Math.floor(rng() * (maxA - minA + 1))

    // Initialize fixed grid
    const fixed: CellFixed[][] = Array.from({ length: size }, () =>
      Array(size).fill(null) as CellFixed[]
    )

    // Place A cells
    placeAs(fixed, size, numA, rng)

    // Build content grid for assigning Bs
    const grid: CellContent[][] = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) =>
        fixed[r][c] === 'A' ? 'A' : 'empty'
      )
    )

    // Collect panda cells
    const pandaCells: [number, number][] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (fixed[r][c] === 'A') pandaCells.push([r, c])
      }
    }

    // Assign B to each A
    if (!assignBs(fixed, grid, size, pandaCells, 0, rng)) continue

    // Build solution: A cells stay as A, B cells as B, rest as empty
    const solution: CellContent[][] = grid.map(row =>
      row.map(cell => (cell === 'A' || cell === 'B' ? cell : 'empty'))
    )

    // Compute row/col counts
    const rowCounts = Array(size).fill(0)
    const colCounts = Array(size).fill(0)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (solution[r][c] === 'B') {
          rowCounts[r]++
          colCounts[c]++
        }
      }
    }

    // Limit zero-rows and zero-cols to at most 2 each
    const zeroRows = rowCounts.filter(c => c === 0).length
    const zeroCols = colCounts.filter(c => c === 0).length
    if (zeroRows > 2 || zeroCols > 2) continue

    const puzzle: PandaPuzzle = {
      id: `panda-${difficulty}-${actualSeed}`,
      size,
      fixed,
      rowCounts,
      colCounts,
      solution,
      difficulty,
      seed: actualSeed,
    }

    // Check unique solution
    const numSolutions = countSolutions(puzzle)
    if (numSolutions === 1) {
      return puzzle
    }
  }

  // Fallback: return last generated puzzle even if not unique
  // (shouldn't normally happen within 50 attempts)
  const rng = createRng(actualSeed)
  const { size, minA, maxA } = config
  const numA = minA + Math.floor(rng() * (maxA - minA + 1))

  const fixed: CellFixed[][] = Array.from({ length: size }, () =>
    Array(size).fill(null) as CellFixed[]
  )
  placeAs(fixed, size, numA, rng)

  const grid: CellContent[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      fixed[r][c] === 'A' ? 'A' : 'empty'
    )
  )

  const pandaCells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (fixed[r][c] === 'A') pandaCells.push([r, c])
    }
  }

  assignBs(fixed, grid, size, pandaCells, 0, rng)

  const solution: CellContent[][] = grid.map(row =>
    row.map(cell => (cell === 'A' || cell === 'B' ? cell : 'empty'))
  )

  const rowCounts = Array(size).fill(0)
  const colCounts = Array(size).fill(0)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (solution[r][c] === 'B') {
        rowCounts[r]++
        colCounts[c]++
      }
    }
  }

  return {
    id: `panda-${difficulty}-${actualSeed}`,
    size,
    fixed,
    rowCounts,
    colCounts,
    solution,
    difficulty,
    seed: actualSeed,
  }
}
