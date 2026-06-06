import { SumsPuzzle, GridCell } from './types'

export interface RunInfo {
  cells: [number, number][]
  sum: number
  direction: 'h' | 'v'
}

export function identifyRuns(grid: GridCell[][], size: number): RunInfo[] {
  const runs: RunInfo[] = []

  for (let r = 0; r < size; r++) {
    let c = 0
    while (c < size) {
      if (grid[r]![c]!.type === 'black') { c++; continue }
      const startC = c
      const cells: [number, number][] = []
      while (c < size && grid[r]![c]!.type === 'white') { cells.push([r, c]); c++ }
      if (cells.length >= 2 && startC > 0) {
        const header = grid[r]![startC - 1]!
        if (header.type === 'black' && header.sumRight !== undefined) {
          runs.push({ cells, sum: header.sumRight, direction: 'h' })
        }
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let r = 0
    while (r < size) {
      if (grid[r]![c]!.type === 'black') { r++; continue }
      const startR = r
      const cells: [number, number][] = []
      while (r < size && grid[r]![c]!.type === 'white') { cells.push([r, c]); r++ }
      if (cells.length >= 2 && startR > 0) {
        const header = grid[startR - 1]![c]!
        if (header.type === 'black' && header.sumDown !== undefined) {
          runs.push({ cells, sum: header.sumDown, direction: 'v' })
        }
      }
    }
  }

  return runs
}

export function solve(puzzle: SumsPuzzle): SumsPuzzle | null {
  const { grid, solution, size } = puzzle
  const runs = identifyRuns(grid, size)
  for (const run of runs) {
    const vals: number[] = []
    for (const [r, c] of run.cells) {
      const v = solution[r]?.[c]
      if (v == null) return null
      vals.push(v)
    }
    if (vals.reduce((a, b) => a + b, 0) !== run.sum) return null
    if (new Set(vals).size !== vals.length) return null
  }
  return puzzle
}

// maxOps: 操作上限。超えた場合は-1を返す（budget切れ）
export function countSolutions(puzzle: SumsPuzzle, maxOps = 1000000): number {
  const { grid, size } = puzzle
  const runs = identifyRuns(grid, size)

  const hRunOf = new Map<string, RunInfo>()
  const vRunOf = new Map<string, RunInfo>()
  for (const run of runs) {
    for (const [r, c] of run.cells) {
      const key = `${r},${c}`
      if (run.direction === 'h') hRunOf.set(key, run)
      else vRunOf.set(key, run)
    }
  }

  const whiteCells: [number, number][] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r]![c]!.type === 'white') whiteCells.push([r, c])

  const cur: (number | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
  let found = 0
  let ops = 0

  function bt(idx: number): void {
    if (found >= 2 || ops++ >= maxOps) return
    if (idx === whiteCells.length) { found++; return }
    const [r, c] = whiteCells[idx]!
    const key = `${r},${c}`
    const hr = hRunOf.get(key)
    const vr = vRunOf.get(key)

    for (let val = 1; val <= 9; val++) {
      if (hr) {
        const usedH = hr.cells.map(([ar, ac]) => cur[ar]?.[ac]).filter((v): v is number => v != null)
        if (usedH.includes(val)) continue
        const psum = usedH.reduce((a, b) => a + b, 0) + val
        if (psum > hr.sum) continue
        const rem = hr.cells.length - usedH.length - 1
        if (rem === 0 && psum !== hr.sum) continue
      }
      if (vr) {
        const usedV = vr.cells.map(([ar, ac]) => cur[ar]?.[ac]).filter((v): v is number => v != null)
        if (usedV.includes(val)) continue
        const psum = usedV.reduce((a, b) => a + b, 0) + val
        if (psum > vr.sum) continue
        const rem = vr.cells.length - usedV.length - 1
        if (rem === 0 && psum !== vr.sum) continue
      }
      cur[r]![c] = val
      bt(idx + 1)
      cur[r]![c] = null
      if (found >= 2 || ops >= maxOps) return
    }
  }

  bt(0)
  // budget切れの場合は -1（一意解不明）
  if (ops >= maxOps && found < 2) return -1
  return found
}
