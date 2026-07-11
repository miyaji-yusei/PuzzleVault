import { Difficulty } from '../../types/engine'
import { CellMark, ColorGroup, SumsPuzzle } from './types'
import { countSolutions } from './solver'

const SIZE = 5
const NUM_GROUPS: Record<Difficulty, number> = { easy: 3, normal: 4, hard: 5, expert: 5 }
const MAX_VAL: Record<Difficulty, number> = { easy: 5, normal: 6, hard: 7, expert: 8 }

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
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function createColorGroups(numGroups: number, rng: () => number): ColorGroup[] {
  const assignment = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(-1))
  const groups: ColorGroup[] = Array.from({ length: numGroups }, (_, i) => ({
    id: i,
    colorIndex: i,
    cells: [] as [number, number][],
    targetSum: 0,
  }))

  // Pick seeds as far apart as possible using shuffled cells
  const allCells = shuffle(
    Array.from({ length: SIZE * SIZE }, (_, i): [number, number] => [Math.floor(i / SIZE), i % SIZE]),
    rng
  )
  const seeds = allCells.slice(0, numGroups)
  for (let i = 0; i < numGroups; i++) {
    const [r, c] = seeds[i]!
    assignment[r]![c] = i
    groups[i]!.cells.push([r, c])
  }

  // BFS Voronoi expansion with random queue order
  const queue = seeds.map(([r, c], i) => ({ r, c, group: i }))
  while (queue.length > 0) {
    const idx = Math.floor(rng() * queue.length)
    const item = queue.splice(idx, 1)[0]!
    const { r, c, group } = item
    const neighbors: [number, number][] = [
      [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
    ].filter(([nr, nc]) =>
      nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && assignment[nr]![nc] === -1
    ) as [number, number][]
    for (const [nr, nc] of neighbors) {
      assignment[nr]![nc] = group
      groups[group]!.cells.push([nr, nc])
      queue.push({ r: nr, c: nc, group })
    }
  }

  // Fallback: assign any remaining unassigned cells
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (assignment[r]![c] !== -1) continue
      const dirs: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      for (const [nr, nc] of dirs) {
        const g = assignment[nr as number]?.[nc as number]
        if (g !== undefined && g !== -1) {
          assignment[r]![c] = g
          groups[g]!.cells.push([r, c])
          break
        }
      }
    }
  }

  return groups
}

function tryGenerate(difficulty: Difficulty, seed: number): SumsPuzzle | null {
  const rng = createRng(seed)
  const maxVal = MAX_VAL[difficulty]
  const numGroups = NUM_GROUPS[difficulty]

  // 1. Generate grid values
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => Math.floor(rng() * maxVal) + 1)
  )

  // 2. Create color groups
  const colorGroups = createColorGroups(numGroups, rng)

  // 3. Generate solution (each cell is circle or cross)
  // Ensure at least 30% circles and 30% crosses for interesting puzzles
  const solution: CellMark[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, (): CellMark => rng() < 0.5 ? 'circle' : 'cross')
  )

  // Ensure minimum distribution
  let circles = solution.flat().filter(m => m === 'circle').length
  let crosses = solution.flat().filter(m => m === 'cross').length
  if (circles < 8 || crosses < 8) return null

  // 4. Calculate constraints
  const rowSums = Array.from({ length: SIZE }, (_, i) =>
    solution[i]!.reduce((s, mark, j) => s + (mark === 'circle' ? grid[i]![j]! : 0), 0)
  )
  const colSums = Array.from({ length: SIZE }, (_, j) =>
    solution.reduce((s, row, i) => s + (row[j] === 'circle' ? grid[i]![j]! : 0), 0)
  )

  for (const group of colorGroups) {
    group.targetSum = group.cells.reduce(
      (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0),
      0
    )
    // Each group must have at least one circle for a meaningful constraint
    const hasCircle = group.cells.some(([r, c]) => solution[r]![c] === 'circle')
    if (!hasCircle) return null
  }

  // Reject trivial constraints (all zeros or all sums equal total)
  const total = grid.flat().reduce((a, b) => a + b, 0)
  if (rowSums.some(s => s === 0) || rowSums.some(s => s === total)) return null

  const puzzle: SumsPuzzle = {
    id: `sums-${difficulty}-${seed}`,
    grid,
    solution,
    rowSums,
    colSums,
    colorGroups,
    difficulty,
    seed,
  }

  // 5. Verify unique solution
  if (countSolutions(puzzle, 200000) !== 1) return null

  return puzzle
}

export function generate(difficulty: Difficulty, seed?: number): SumsPuzzle {
  const base = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const deadline = Date.now() + 4000
  for (let i = 0; i < 1000; i++) {
    if (Date.now() > deadline) break
    const p = tryGenerate(difficulty, (base + i) >>> 0)
    if (p) return p
  }

  // Fallback: construct a simple valid puzzle
  return buildFallback(difficulty, base)
}

function buildFallback(difficulty: Difficulty, seed: number): SumsPuzzle {
  const grid = [
    [3, 1, 4, 2, 5],
    [2, 4, 1, 5, 3],
    [5, 2, 3, 1, 4],
    [1, 5, 2, 4, 3],
    [4, 3, 5, 3, 1],
  ]
  const solution: CellMark[][] = [
    ['circle', 'cross', 'circle', 'cross', 'circle'],
    ['cross', 'circle', 'cross', 'circle', 'cross'],
    ['circle', 'cross', 'circle', 'cross', 'circle'],
    ['cross', 'circle', 'cross', 'circle', 'cross'],
    ['circle', 'cross', 'circle', 'cross', 'circle'],
  ]
  const colorGroups: ColorGroup[] = [
    { id: 0, colorIndex: 0, cells: [[0,0],[0,1],[1,0],[1,1],[2,0]], targetSum: 3 + 1 + 5 + 3 },
    { id: 1, colorIndex: 1, cells: [[0,2],[0,3],[0,4],[1,2],[1,3]], targetSum: 4 + 5 },
    { id: 2, colorIndex: 2, cells: [[1,4],[2,1],[2,2],[2,3],[2,4]], targetSum: 3 + 4 },
    { id: 3, colorIndex: 3, cells: [[3,0],[3,1],[3,2],[4,0],[4,1]], targetSum: 1 + 4 },
    { id: 4, colorIndex: 4, cells: [[3,3],[3,4],[4,2],[4,3],[4,4]], targetSum: 4 + 5 + 1 },
  ]
  // Recalculate sums
  colorGroups[0]!.targetSum = colorGroups[0]!.cells.reduce(
    (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0), 0
  )
  colorGroups[1]!.targetSum = colorGroups[1]!.cells.reduce(
    (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0), 0
  )
  colorGroups[2]!.targetSum = colorGroups[2]!.cells.reduce(
    (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0), 0
  )
  colorGroups[3]!.targetSum = colorGroups[3]!.cells.reduce(
    (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0), 0
  )
  colorGroups[4]!.targetSum = colorGroups[4]!.cells.reduce(
    (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0), 0
  )
  const rowSums = Array.from({ length: SIZE }, (_, i) =>
    solution[i]!.reduce((s, mark, j) => s + (mark === 'circle' ? grid[i]![j]! : 0), 0)
  )
  const colSums = Array.from({ length: SIZE }, (_, j) =>
    solution.reduce((s, row, i) => s + (row[j] === 'circle' ? grid[i]![j]! : 0), 0)
  )
  return { id: `sums-${difficulty}-${seed}`, grid, solution, rowSums, colSums, colorGroups, difficulty, seed }
}
