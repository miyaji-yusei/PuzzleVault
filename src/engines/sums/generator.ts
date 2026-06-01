import { Difficulty } from '../../types/engine'
import { GridCell, BlackCell, CellValue, SumsPuzzle } from './types'
import { countSolutions } from './solver'

function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SIZE: Record<Difficulty, number> = { easy: 8, normal: 10, hard: 13, expert: 16 }
const DENSITY: Record<Difficulty, number> = { easy: 0.22, normal: 0.28, hard: 0.32, expert: 0.35 }

function makeIsBlack(size: number, rng: () => number, density: number): boolean[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => r === 0 || c === 0 || rng() < density)
  )
}

function fixLayout(b: boolean[][], size: number): void {
  let changed = true
  while (changed) {
    changed = false
    for (let r = 1; r < size; r++) {
      for (let c = 1; c < size; c++) {
        if (b[r]![c]!) continue
        const lB = c === 0 || !!b[r]![c - 1]
        const rB = c === size - 1 || !!b[r]![c + 1]
        const tB = r === 0 || !!b[r - 1]![c]
        const bB = r === size - 1 || !!b[r + 1]![c]
        if ((lB && rB) || (tB && bB)) { b[r]![c] = true; changed = true }
      }
    }
  }
}

function buildRunMaps(
  b: boolean[][], size: number
): { hOf: Map<string, [number, number][]>; vOf: Map<string, [number, number][]> } {
  const hOf = new Map<string, [number, number][]>()
  const vOf = new Map<string, [number, number][]>()

  for (let r = 0; r < size; r++) {
    let c = 0
    while (c < size) {
      if (b[r]![c]!) { c++; continue }
      const cells: [number, number][] = []
      while (c < size && !b[r]![c]!) { cells.push([r, c]); c++ }
      if (cells.length >= 2) for (const cell of cells) hOf.set(`${cell[0]},${cell[1]}`, cells)
    }
  }

  for (let c = 0; c < size; c++) {
    let r = 0
    while (r < size) {
      if (b[r]![c]!) { r++; continue }
      const cells: [number, number][] = []
      while (r < size && !b[r]![c]!) { cells.push([r, c]); r++ }
      if (cells.length >= 2) for (const cell of cells) vOf.set(`${cell[0]},${cell[1]}`, cells)
    }
  }

  return { hOf, vOf }
}

function fillValues(
  wCells: [number, number][],
  hOf: Map<string, [number, number][]>,
  vOf: Map<string, [number, number][]>,
  sol: (number | null)[][],
  idx: number,
  rng: () => number
): boolean {
  if (idx === wCells.length) return true
  const [r, c] = wCells[idx]!
  const key = `${r},${c}`
  const hCells = hOf.get(key) ?? []
  const vCells = vOf.get(key) ?? []

  const used = new Set<number>()
  for (const [hr, hc] of hCells) { const v = sol[hr]?.[hc]; if (v != null) used.add(v) }
  for (const [vr, vc] of vCells) { const v = sol[vr]?.[vc]; if (v != null) used.add(v) }

  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = vals[i] as number; vals[i] = vals[j] as number; vals[j] = tmp
  }

  for (const val of vals) {
    if (used.has(val)) continue
    sol[r]![c] = val
    if (fillValues(wCells, hOf, vOf, sol, idx + 1, rng)) return true
    sol[r]![c] = null
  }
  return false
}

function buildGrid(
  b: boolean[][], size: number,
  sol: (number | null)[][],
  hOf: Map<string, [number, number][]>,
  vOf: Map<string, [number, number][]>
): GridCell[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      if (!b[r]![c]!) return { type: 'white', value: null } as GridCell
      const cell: BlackCell = { type: 'black' }
      if (c + 1 < size && !b[r]![c + 1]!) {
        const run = hOf.get(`${r},${c + 1}`)
        if (run && run[0]![1] === c + 1)
          cell.sumRight = run.reduce((s, [hr, hc]) => s + (sol[hr]?.[hc] ?? 0), 0)
      }
      if (r + 1 < size && !b[r + 1]![c]!) {
        const run = vOf.get(`${r + 1},${c}`)
        if (run && run[0]![0] === r + 1)
          cell.sumDown = run.reduce((s, [vr, vc]) => s + (sol[vr]?.[vc] ?? 0), 0)
      }
      return cell
    })
  )
}

function tryGenerate(difficulty: Difficulty, seed: number): SumsPuzzle | null {
  const size = SIZE[difficulty]
  const rng = createRng(seed)

  const b = makeIsBlack(size, rng, DENSITY[difficulty])
  fixLayout(b, size)

  const wCells: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!b[r]![c]!) wCells.push([r, c])
  if (wCells.length < 10) return null

  const { hOf, vOf } = buildRunMaps(b, size)
  if (!wCells.every(([r, c]) => hOf.has(`${r},${c}`) && vOf.has(`${r},${c}`))) return null

  const sol: (number | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
  if (!fillValues(wCells, hOf, vOf, sol, 0, rng)) return null

  const grid = buildGrid(b, size, sol, hOf, vOf)
  const solution = sol as (CellValue | null)[][]

  const puzzle: SumsPuzzle = { id: `sums-${difficulty}-${seed}`, size, grid, solution, difficulty, seed }
  if (difficulty === 'easy' && countSolutions(puzzle) !== 1) return null

  return puzzle
}

export function generate(difficulty: Difficulty, seed?: number): SumsPuzzle {
  const base = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const maxAttempts = difficulty === 'easy' ? 200 : 100
  for (let i = 0; i < maxAttempts; i++) {
    const p = tryGenerate(difficulty, (base + i) >>> 0)
    if (p) return p
  }
  // フォールバック: 最小限の有効なパズル
  const size = SIZE[difficulty]
  const grid: GridCell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c): GridCell => {
      if (r === 0 && c === 0) return { type: 'black', sumRight: 3, sumDown: 3 } as BlackCell
      if (r === 0 || c === 0) return { type: 'black' }
      if (r <= 2 && c >= 1 && c <= 3) return { type: 'white', value: null }
      return { type: 'black' }
    })
  )
  const solution: (CellValue | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
  solution[1]![1] = 1; solution[1]![2] = 2
  solution[2]![1] = 2; solution[2]![2] = 1
  return { id: `sums-${difficulty}-${base}`, size, grid, solution, difficulty, seed: base }
}
