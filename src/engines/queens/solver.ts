import { QueensPuzzle, ColorId } from './types'

function isAdjacentToAny(queens: [number, number][], row: number, col: number): boolean {
  for (const [qr, qc] of queens) {
    if (Math.abs(qr - row) <= 1 && Math.abs(qc - col) <= 1) return true
  }
  return false
}

/**
 * バックトラックでクイーンズパズルを解く
 * 戻り値: クイーンの位置リスト、または null（解なし）
 */
function solveBacktrack(
  n: number,
  regions: ColorId[][],
  row: number,
  usedCols: Set<number>,
  usedColors: Set<number>,
  queens: [number, number][]
): [number, number][] | null {
  if (row === n) return [...queens]

  for (let col = 0; col < n; col++) {
    if (usedCols.has(col)) continue
    const color = regions[row][col]
    if (usedColors.has(color)) continue
    if (isAdjacentToAny(queens, row, col)) continue

    usedCols.add(col)
    usedColors.add(color)
    queens.push([row, col])

    const result = solveBacktrack(n, regions, row + 1, usedCols, usedColors, queens)
    if (result !== null) return result

    queens.pop()
    usedCols.delete(col)
    usedColors.delete(color)
  }

  return null
}

/**
 * クイーンズパズルを解いて解を返す
 */
export function solve(puzzle: QueensPuzzle): QueensPuzzle | null {
  const { size, regions } = puzzle
  const result = solveBacktrack(
    size,
    regions,
    0,
    new Set<number>(),
    new Set<number>(),
    []
  )

  if (result === null) return null

  const solution: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false) as boolean[]
  )
  for (const [r, c] of result) {
    solution[r][c] = true
  }

  return { ...puzzle, solution }
}

/**
 * 解の個数を数える（最大2で打ち切り）
 */
function countHelper(
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

    countHelper(n, regions, row + 1, usedCols, usedColors, queens, count)

    queens.pop()
    usedCols.delete(col)
    usedColors.delete(color)
  }
}

export function countSolutions(puzzle: QueensPuzzle): number {
  const { size, regions } = puzzle
  const count = { value: 0 }
  countHelper(
    size,
    regions,
    0,
    new Set<number>(),
    new Set<number>(),
    [],
    count
  )
  return count.value
}
