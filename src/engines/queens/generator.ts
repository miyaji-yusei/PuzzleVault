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

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]] as const

// queens[r] = row r のクイーンの列。
// 最適化: 直前行のクイーンのみ隣接チェックすればよい（2行以上離れたクイーンは絶対に隣接しない）
function placeQueens(
  n: number,
  row: number,
  queens: number[],
  colMask: number,
  prevCol: number,
  colOrder: number[],
  rng: () => number
): number[] | null {
  if (row === n) return queens
  const shuffled = shuffle(colOrder, rng)
  for (const col of shuffled) {
    if (colMask & (1 << col)) continue
    if (Math.abs(prevCol - col) <= 1) continue
    queens.push(col)
    const result = placeQueens(n, row + 1, queens, colMask | (1 << col), col, colOrder, rng)
    if (result !== null) return result
    queens.pop()
  }
  return null
}

// ランダムフロンティア拡張で領域を生成（Voronoiより非対称で一意解になりやすい）
function buildRegions(n: number, queenCols: number[], rng: () => number): number[] {
  const regions = new Array<number>(n * n).fill(-1)
  for (let r = 0; r < n; r++) {
    regions[r * n + queenCols[r]] = r
  }

  const frontier: number[] = []
  const fColor: number[] = []
  for (let r = 0; r < n; r++) {
    const qc = queenCols[r]
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = qc + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr * n + nc] === -1) {
        frontier.push(nr * n + nc)
        fColor.push(r)
      }
    }
  }

  while (frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length)
    const pos = frontier[idx]
    const color = fColor[idx]
    const last = frontier.length - 1
    frontier[idx] = frontier[last]; frontier.pop()
    fColor[idx] = fColor[last]; fColor.pop()
    if (regions[pos] !== -1) continue
    regions[pos] = color
    const r = (pos / n) | 0, c = pos % n
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      const npos = nr * n + nc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[npos] === -1) {
        frontier.push(npos)
        fColor.push(color)
      }
    }
  }

  return regions
}

// ビットマスク + O(1)隣接チェック高速解カウント
function countSolutionsFast(
  n: number,
  regions: number[],
  row: number,
  colMask: number,
  colorMask: number,
  prevCol: number,
  count: { value: number },
  maxCount: number
): void {
  if (count.value >= maxCount) return
  if (row === n) { count.value++; return }
  for (let col = 0; col < n; col++) {
    if (colMask & (1 << col)) continue
    if (Math.abs(prevCol - col) <= 1) continue
    const color = regions[row * n + col]
    if (colorMask & (1 << color)) continue
    countSolutionsFast(n, regions, row + 1, colMask | (1 << col), colorMask | (1 << color), col, count, maxCount)
  }
}

function hasUniqueSolution(n: number, regions: number[]): boolean {
  const count = { value: 0 }
  countSolutionsFast(n, regions, 0, 0, 0, -100, count, 2)
  return count.value === 1
}

// 代替解（primary 以外の解）を1つ探す。limit を超えたら打ち切り exhausted=true を返す。
function findAltSolution(
  n: number,
  regions: number[],
  primary: number[],
  limit = Infinity
): { alt: number[] | null; exhausted: boolean } {
  const found: number[][] = []
  let nodes = 0

  function bt(row: number, colMask: number, colorMask: number, prevCol: number, queens: number[]) {
    if (found.length >= 1 || nodes >= limit) return
    nodes++
    if (row === n) {
      for (let r = 0; r < n; r++) {
        if (queens[r] !== primary[r]) { found.push([...queens]); return }
      }
      return
    }
    for (let col = 0; col < n; col++) {
      if (colMask & (1 << col)) continue
      if (Math.abs(prevCol - col) <= 1) continue
      const color = regions[row * n + col]
      if (colorMask & (1 << color)) continue
      queens.push(col)
      bt(row + 1, colMask | (1 << col), colorMask | (1 << color), col, queens)
      queens.pop()
    }
  }

  bt(0, 0, 0, -100, [])
  return { alt: found[0] ?? null, exhausted: nodes >= limit }
}

function isRegionConnected(n: number, regions: number[], color: number): boolean {
  let start = -1, total = 0
  for (let i = 0; i < n * n; i++) {
    if (regions[i] === color) { total++; if (start === -1) start = i }
  }
  if (start === -1) return false

  const visited = new Uint8Array(n * n)
  const queue: number[] = [start]
  visited[start] = 1
  let head = 0, count = 1

  while (head < queue.length) {
    const pos = queue[head++]
    const r = (pos / n) | 0, c = pos % n
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc
      const npos = nr * n + nc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[npos] === color && !visited[npos]) {
        visited[npos] = 1; count++; queue.push(npos)
      }
    }
  }
  return count === total
}

// 代替クイーン位置への調整を1回行う（altを引数に受け取り、findAltSolutionを呼ばない）
function applyTargetedAdjustment(
  n: number,
  regions: number[],
  queenCols: number[],
  queenSet: Set<number>,
  alt: number[],
  rng: () => number
): number[] {
  const rows = shuffle(Array.from({ length: n }, (_, i) => i), rng)
  let working = [...regions]
  let anyChanged = false

  for (const r of rows) {
    const ac = alt[r]
    const pos = r * n + ac
    if (queenSet.has(pos)) continue

    const altColor = working[pos]
    const intendedColor = working[r * n + queenCols[r]]

    const targets: number[] = []
    if (intendedColor !== altColor) targets.push(intendedColor)
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = ac + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        const neighborColor = working[nr * n + nc]
        if (neighborColor !== altColor && !targets.includes(neighborColor)) targets.push(neighborColor)
      }
    }

    for (const newColor of targets) {
      const candidate = [...working]
      candidate[pos] = newColor
      if (isRegionConnected(n, candidate, altColor)) {
        working = candidate
        anyChanged = true
        break
      }
    }
  }

  if (anyChanged) return working

  // フォールバック: ランダム境界セル調整
  const borderCells: [number, number, number][] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const pos = r * n + c
      if (queenSet.has(pos)) continue
      const color = regions[pos]
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc
        if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr * n + nc] !== color) {
          borderCells.push([pos, color, regions[nr * n + nc]])
          break
        }
      }
    }
  }
  if (borderCells.length === 0) return regions
  const [bpos, oldColor, newColor] = borderCells[Math.floor(rng() * borderCells.length)]
  const test = [...regions]
  test[bpos] = newColor
  if (isRegionConnected(n, test, oldColor)) return test
  return regions
}

// フェーズ1: bounded探索で高速に代替解を見つけ1回調整を繰り返す。
// フェーズ2: 近一意状態になったら無制限探索で残りの代替解を潰す。
function adjustForUniqueness(
  n: number,
  regions: number[],
  queenCols: number[],
  rng: () => number
): { regions: number[]; unique: boolean } {
  const queenSet = new Set<number>(queenCols.map((c, r) => r * n + c))
  const FAST_NODES = 5000
  const MAX_FAST_ROUNDS = 150
  const MAX_FULL_ROUNDS = 8

  // フェーズ1: 高速bounded探索
  for (let round = 0; round < MAX_FAST_ROUNDS; round++) {
    const { alt, exhausted } = findAltSolution(n, regions, queenCols, FAST_NODES)
    if (!exhausted && alt === null) return { regions, unique: true }
    if (exhausted && alt === null) break  // 近一意 → フェーズ2へ
    regions = applyTargetedAdjustment(n, regions, queenCols, queenSet, alt!, rng)
  }

  // フェーズ2: 無制限探索で残りの代替解を潰す
  for (let round = 0; round < MAX_FULL_ROUNDS; round++) {
    const { alt } = findAltSolution(n, regions, queenCols)
    if (alt === null) return { regions, unique: true }
    regions = applyTargetedAdjustment(n, regions, queenCols, queenSet, alt, rng)
  }

  return { regions, unique: false }
}

export function generate(difficulty: Difficulty, seed: number): QueensPuzzle {
  const n = DIFFICULTY_SIZE[difficulty]
  const actualSeed = seed >>> 0
  const colOrder = Array.from({ length: n }, (_, i) => i)

  for (let attempt = 0; attempt < 300; attempt++) {
    // 試行ごとに独立したサブシードで、同一seedなら常に同じ結果を保証する
    const subSeed = (actualSeed + attempt * 0x9e3779b9) >>> 0
    const rng = createRng(subSeed)

    const queenCols = placeQueens(n, 0, [], 0, -100, colOrder, rng)
    if (queenCols === null) continue

    const flatRegions = buildRegions(n, queenCols, rng)
    const { regions: adjustedRegions, unique } = adjustForUniqueness(n, flatRegions, queenCols, rng)

    if (!unique) continue

    const regions: ColorId[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => adjustedRegions[r * n + c] as ColorId)
    )
    const solution: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false) as boolean[])
    for (let r = 0; r < n; r++) solution[r][queenCols[r]] = true

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
