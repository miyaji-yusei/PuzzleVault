import { QueensPuzzle, ColorId } from './types'
import { Difficulty } from '../../types/engine'

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

const DIFFICULTY_SIZE: Record<Difficulty, number> = {
  easy: 6,
  normal: 8,
  hard: 10,
  expert: 12,
}

function isAdjacentToAny(
  queens: [number, number][],
  row: number,
  col: number
): boolean {
  for (const [qr, qc] of queens) {
    if (Math.abs(qr - row) <= 1 && Math.abs(qc - col) <= 1) return true
  }
  return false
}

function placeQueens(
  n: number,
  row: number,
  queens: [number, number][],
  usedCols: Set<number>,
  colOrder: number[],
  rng: () => number
): [number, number][] | null {
  if (row === n) return queens

  const shuffledCols = shuffle(colOrder, rng)
  for (const col of shuffledCols) {
    if (usedCols.has(col)) continue
    if (isAdjacentToAny(queens, row, col)) continue

    usedCols.add(col)
    queens.push([row, col])
    const result = placeQueens(n, row + 1, queens, usedCols, colOrder, rng)
    if (result !== null) return result
    queens.pop()
    usedCols.delete(col)
  }
  return null
}

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const

/**
 * ランダムフロンティア拡張で領域を生成する。
 * Voronoi（純粋BFS）と異なり、各ステップでランダムなフロンティアセルを選ぶため
 * 不規則な形状の領域が生成され、一意解を持ちやすくなる。
 */
function buildRegions(n: number, queens: [number, number][], rng: () => number): ColorId[][] {
  const regions: ColorId[][] = Array.from({ length: n }, () =>
    Array(n).fill(-1) as ColorId[]
  )

  for (let i = 0; i < queens.length; i++) {
    const [r, c] = queens[i]
    regions[r][c] = i as ColorId
  }

  const frontier: [number, number, ColorId][] = []
  for (let i = 0; i < queens.length; i++) {
    const [qr, qc] = queens[i]
    for (const [dr, dc] of DIRS) {
      const nr = qr + dr
      const nc = qc + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === -1) {
        frontier.push([nr, nc, i as ColorId])
      }
    }
  }

  while (frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length)
    const [r, c, color] = frontier[idx]
    frontier[idx] = frontier[frontier.length - 1]
    frontier.pop()

    if (regions[r][c] !== -1) continue

    regions[r][c] = color
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === -1) {
        frontier.push([nr, nc, color])
      }
    }
  }

  return regions
}

function countSolutionsInternal(
  n: number,
  regions: ColorId[][],
  row: number,
  usedCols: Set<number>,
  usedColors: Set<number>,
  queens: [number, number][],
  count: { value: number }
): void {
  if (count.value > 1) return
  if (row === n) {
    count.value++
    return
  }

  for (let col = 0; col < n; col++) {
    if (usedCols.has(col)) continue
    const color = regions[row][col]
    if (usedColors.has(color)) continue
    if (isAdjacentToAny(queens, row, col)) continue

    usedCols.add(col)
    usedColors.add(color)
    queens.push([row, col])
    countSolutionsInternal(n, regions, row + 1, usedCols, usedColors, queens, count)
    queens.pop()
    usedCols.delete(col)
    usedColors.delete(color)
  }
}

function hasUniqueSolution(n: number, regions: ColorId[][]): boolean {
  const count = { value: 0 }
  countSolutionsInternal(n, regions, 0, new Set(), new Set(), [], count)
  return count.value === 1
}

function isRegionConnected(n: number, regions: ColorId[][], color: ColorId): boolean {
  let start: [number, number] | null = null
  let total = 0

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (regions[r][c] === color) {
        total++
        if (start === null) start = [r, c]
      }
    }
  }

  if (start === null) return false

  const visited = new Uint8Array(n * n)
  const queue: [number, number][] = [start]
  visited[start[0] * n + start[1]] = 1
  let head = 0
  let count = 1

  while (head < queue.length) {
    const [r, c] = queue[head++]
    for (const [dr, dc] of DIRS) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === color && !visited[nr * n + nc]) {
        visited[nr * n + nc] = 1
        count++
        queue.push([nr, nc])
      }
    }
  }

  return count === total
}

function adjustForUniqueness(
  n: number,
  regions: ColorId[][],
  queens: [number, number][],
  rng: () => number,
  maxAttempts = 200
): ColorId[][] {
  const queenSet = new Set(queens.map(([r, c]) => r * n + c))

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (hasUniqueSolution(n, regions)) return regions

    const borderCells: [number, number, ColorId, ColorId][] = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (queenSet.has(r * n + c)) continue

        const currentColor = regions[r][c]
        for (const [dr, dc] of DIRS) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
            const neighborColor = regions[nr][nc]
            if (neighborColor !== currentColor) {
              borderCells.push([r, c, currentColor, neighborColor])
              break
            }
          }
        }
      }
    }

    if (borderCells.length === 0) break

    const idx = Math.floor(rng() * borderCells.length)
    const [br, bc, oldColor, newColor] = borderCells[idx]

    const testRegions = regions.map(row => [...row] as ColorId[])
    testRegions[br][bc] = newColor

    if (isRegionConnected(n, testRegions, oldColor)) {
      regions = testRegions
    }
  }

  return regions
}

export function generate(difficulty: Difficulty, seed: number): QueensPuzzle {
  const n = DIFFICULTY_SIZE[difficulty]
  const actualSeed = seed >>> 0
  const colOrder = Array.from({ length: n }, (_, i) => i)

  for (let attempt = 0; attempt < 50; attempt++) {
    // 各試行に独立した決定論的サブシードを使うことで、シードが同じなら常に同じ結果を返しつつ、
    // 試行ごとに異なる探索空間をカバーできる。
    const subSeed = (actualSeed + attempt * 0x9e3779b9) >>> 0
    const rng = createRng(subSeed)

    const placedQueens = placeQueens(n, 0, [], new Set<number>(), colOrder, rng)
    if (placedQueens === null) continue

    let regions = buildRegions(n, placedQueens, rng)
    regions = adjustForUniqueness(n, regions, placedQueens, rng, 200)

    if (!hasUniqueSolution(n, regions)) continue

    const solution: boolean[][] = Array.from({ length: n }, () =>
      Array(n).fill(false) as boolean[]
    )
    for (const [r, c] of placedQueens) {
      solution[r][c] = true
    }

    return {
      id: `queens-${difficulty}-${actualSeed}`,
      size: n,
      regions,
      solution,
      difficulty,
      seed: actualSeed,
    }
  }

  throw new Error(`Failed to generate unique queens puzzle for difficulty ${difficulty} seed ${actualSeed}`)
}
