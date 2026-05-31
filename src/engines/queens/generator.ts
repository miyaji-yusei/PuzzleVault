import { QueensPuzzle, ColorId } from './types'
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

const DIFFICULTY_SIZE: Record<Difficulty, number> = {
  easy: 6,
  normal: 8,
  hard: 10,
  expert: 12,
}

/**
 * 8方向に隣接するセルのチェック
 */
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

/**
 * バックトラックでN個のクイーンを配置
 * 各行・各列にクイーンが1つ、8方向に非隣接
 */
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

/**
 * クイーン位置を基にVoronoiベースで領域を生成（BFS拡張）
 */
function buildRegions(n: number, queens: [number, number][]): ColorId[][] {
  const regions: ColorId[][] = Array.from({ length: n }, () =>
    Array(n).fill(-1) as ColorId[]
  )

  // 各クイーンを対応する色のシードとして配置
  const queue: [number, number, number][] = []
  for (let i = 0; i < queens.length; i++) {
    const [r, c] = queens[i]
    regions[r][c] = i
    queue.push([r, c, i])
  }

  // BFSで4方向に拡張
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const

  let head = 0
  while (head < queue.length) {
    const item = queue[head++]
    const [r, c, color] = item
    for (const [dr, dc] of dirs) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === -1) {
        regions[nr][nc] = color
        queue.push([nr, nc, color])
      }
    }
  }

  return regions
}

/**
 * 解の一意性チェック用バックトラックソルバー
 * countを最大2で打ち切る
 */
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
  countSolutionsInternal(
    n,
    regions,
    0,
    new Set<number>(),
    new Set<number>(),
    [],
    count
  )
  return count.value === 1
}

/**
 * 一意解になるよう領域を調整する
 * ランダムに境界セルの領域割り当てを変更して再チェック（最大100回）
 */
function adjustForUniqueness(
  n: number,
  regions: ColorId[][],
  queens: [number, number][],
  rng: () => number,
  maxAttempts = 100
): ColorId[][] {
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (hasUniqueSolution(n, regions)) return regions

    // 境界セル（隣接する異なる色のセルを持つセル）を収集
    const borderCells: [number, number, number, number][] = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        // クイーンセルは変更しない
        const isQueenCell = queens.some(([qr, qc]) => qr === r && qc === c)
        if (isQueenCell) continue

        const currentColor = regions[r][c]
        for (const [dr, dc] of dirs) {
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

    // ランダムに境界セルを選んで隣接色に変更
    const idx = Math.floor(rng() * borderCells.length)
    const [br, bc, , newColor] = borderCells[idx]

    // 変更後も元の色領域が連結であることを確認
    const testRegions = regions.map(row => [...row] as ColorId[])
    testRegions[br][bc] = newColor

    // 元の色の連結性チェック
    const oldColor = regions[br][bc]
    const oldColorCells: [number, number][] = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (testRegions[r][c] === oldColor) {
          oldColorCells.push([r, c])
        }
      }
    }

    if (oldColorCells.length === 0) continue

    // BFSで連結チェック
    const visited = new Set<string>()
    const startCell = oldColorCells[0]
    const bfsQueue: [number, number][] = [startCell]
    visited.add(`${startCell[0]},${startCell[1]}`)

    let bfsHead = 0
    while (bfsHead < bfsQueue.length) {
      const [r, c] = bfsQueue[bfsHead++]
      for (const [dr, dc] of dirs) {
        const nr = r + dr
        const nc = c + dc
        if (
          nr >= 0 &&
          nr < n &&
          nc >= 0 &&
          nc < n &&
          testRegions[nr][nc] === oldColor &&
          !visited.has(`${nr},${nc}`)
        ) {
          visited.add(`${nr},${nc}`)
          bfsQueue.push([nr, nc])
        }
      }
    }

    if (visited.size === oldColorCells.length) {
      // 連結性が保たれているので変更を適用
      regions = testRegions
    }
  }

  return regions
}

export function generate(difficulty: Difficulty, seed: number): QueensPuzzle {
  const n = DIFFICULTY_SIZE[difficulty]
  const actualSeed = seed >>> 0
  const rng = createRng(actualSeed)

  const colOrder = Array.from({ length: n }, (_, i) => i)

  // 一意解が得られるまで最大20回リトライ
  for (let attempt = 0; attempt < 20; attempt++) {
    // Step 1: N個のクイーン位置を配置（バックトラック）
    const placedQueens = placeQueens(n, 0, [], new Set<number>(), colOrder, rng)
    if (placedQueens === null) continue

    // Step 2: Voronoiベースで領域を生成
    let regions = buildRegions(n, placedQueens)

    // Step 3: 一意解になるよう調整（最大200回）
    regions = adjustForUniqueness(n, regions, placedQueens, rng, 200)

    // 一意解が得られなかった場合は次のattemptへ
    if (!hasUniqueSolution(n, regions)) continue

    // Step 4: 解ボードを構築
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
