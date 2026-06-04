import { Difficulty } from '../../types/engine'
import { NonogramPuzzle } from './types'
import { solveLine, isUnique } from './solver'

function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function computeClues(line: boolean[]): number[] {
  const clues: number[] = []
  let count = 0
  for (const cell of line) {
    if (cell) {
      count++
    } else if (count > 0) {
      clues.push(count)
      count = 0
    }
  }
  if (count > 0) clues.push(count)
  return clues.length > 0 ? clues : [0]
}

const DIFFICULTY_CONFIG: Record<Difficulty, { minSize: number; maxSize: number; density: number }> = {
  easy:   { minSize: 5,  maxSize: 8,  density: 0.5 },
  normal: { minSize: 10, maxSize: 10, density: 0.55 },
  hard:   { minSize: 15, maxSize: 15, density: 0.6 },
  expert: { minSize: 20, maxSize: 20, density: 0.6 },
}

export function generate(difficulty: Difficulty, seed?: number): NonogramPuzzle {
  const actualSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0

  const rng = createRng(actualSeed)

  const { minSize, maxSize, density } = DIFFICULTY_CONFIG[difficulty]
  const size = minSize + Math.floor(rng() * (maxSize - minSize + 1))

  const MAX_ATTEMPTS = 50

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution: boolean[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => rng() < density)
    )

    const rowClues = solution.map(row => computeClues(row))
    const colClues: number[][] = []
    for (let c = 0; c < size; c++) {
      const col = solution.map(row => row[c])
      colClues.push(computeClues(col))
    }

    if (isUnique({ rowClues, colClues, size, solution })) {
      return {
        id: `nonogram-${difficulty}-${actualSeed}-${attempt}`,
        size,
        rowClues,
        colClues,
        solution,
        difficulty,
        seed: actualSeed,
      }
    }
  }

  // フォールバック: 最後の試行結果をそのまま返す
  const solution: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => rng() < density)
  )
  const rowClues = solution.map(row => computeClues(row))
  const colClues: number[][] = []
  for (let c = 0; c < size; c++) {
    colClues.push(computeClues(solution.map(row => row[c])))
  }

  return {
    id: `nonogram-${difficulty}-${actualSeed}-fallback`,
    size,
    rowClues,
    colClues,
    solution,
    difficulty,
    seed: actualSeed,
  }
}

export { solveLine, computeClues }
