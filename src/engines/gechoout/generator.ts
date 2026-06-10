import { solve } from './solver'
import { Difficulty, GechoOutPuzzle, Hole, Position, Snake } from './types'

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

interface DifficultyConfig {
  size: number
  snakeCount: number
  snakeLength: number
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { size: 4, snakeCount: 2, snakeLength: 2 },
  normal: { size: 5, snakeCount: 3, snakeLength: 2 },
  hard: { size: 6, snakeCount: 4, snakeLength: 2 },
  expert: { size: 7, snakeCount: 5, snakeLength: 2 },
}

const DIRS: Position[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

function cellKey(pos: Position): string {
  return `${pos.row},${pos.col}`
}

// 未使用セルからランダムに長さlengthの蛇を1匹配置する。配置できなければnull
function placeRandomSnake(
  size: number,
  length: number,
  occupied: Set<string>,
  rng: () => number
): Position[] | null {
  const allCells: Position[] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      allCells.push({ row, col })
    }
  }

  for (const start of shuffle(allCells, rng)) {
    if (occupied.has(cellKey(start))) continue

    const cells: Position[] = [start]
    const used = new Set<string>([cellKey(start)])
    let extended = true

    while (cells.length < length && extended) {
      extended = false
      const current = cells[cells.length - 1]
      for (const dir of shuffle(DIRS, rng)) {
        const next: Position = { row: current.row + dir.row, col: current.col + dir.col }
        if (next.row < 0 || next.row >= size || next.col < 0 || next.col >= size) continue
        const key = cellKey(next)
        if (occupied.has(key) || used.has(key)) continue
        cells.push(next)
        used.add(key)
        extended = true
        break
      }
    }

    if (cells.length === length) return cells
  }

  return null
}

// 蛇の頭・尾に隣接する未使用セルの候補一覧を返す(穴の配置候補)
function getAdjacentCandidates(size: number, snake: Snake, occupied: Set<string>): Position[] {
  const ends = [snake.cells[0], snake.cells[snake.cells.length - 1]]
  const bodyKeys = new Set(snake.cells.map(cellKey))
  const seen = new Set<string>()
  const candidates: Position[] = []

  for (const end of ends) {
    for (const dir of DIRS) {
      const pos: Position = { row: end.row + dir.row, col: end.col + dir.col }
      if (pos.row < 0 || pos.row >= size || pos.col < 0 || pos.col >= size) continue
      const key = cellKey(pos)
      if (bodyKeys.has(key) || occupied.has(key) || seen.has(key)) continue
      seen.add(key)
      candidates.push(pos)
    }
  }

  return candidates
}

const MAX_ATTEMPTS = 300

// 障害物なし・単色蛇の基本ステージを生成する。同一seedなら同一問題を返す。
export function generate(difficulty: Difficulty, seed: number): GechoOutPuzzle {
  const { size, snakeCount, snakeLength } = DIFFICULTY_CONFIG[difficulty]
  const actualSeed = seed >>> 0

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const subSeed = (actualSeed + attempt * 0x9e3779b9) >>> 0
    const rng = createRng(subSeed)

    const occupied = new Set<string>()
    const snakes: Snake[] = []
    const holes: Hole[] = []
    let failed = false

    for (let colorId = 0; colorId < snakeCount; colorId++) {
      const cells = placeRandomSnake(size, snakeLength, occupied, rng)
      if (!cells) {
        failed = true
        break
      }

      const snake: Snake = { id: colorId, color: colorId, cells }
      // 蛇の頭または尾に隣接するセルに対応する穴を置き、初手で必ず入れるようにする
      const candidates = getAdjacentCandidates(size, snake, occupied)
      if (candidates.length === 0) {
        failed = true
        break
      }

      for (const cell of cells) occupied.add(cellKey(cell))
      const holePos = shuffle(candidates, rng)[0]
      occupied.add(cellKey(holePos))

      snakes.push(snake)
      holes.push({ color: colorId, position: holePos })
    }

    if (failed) continue

    const puzzle: GechoOutPuzzle = {
      id: `gechoout-${difficulty}-${actualSeed}`,
      size,
      snakes,
      holes,
      obstacles: [],
      difficulty,
      seed: actualSeed,
    }

    if (solve(puzzle) !== null) return puzzle
  }

  throw new Error(`Failed to generate gechoout puzzle for difficulty ${difficulty} seed ${actualSeed}`)
}
