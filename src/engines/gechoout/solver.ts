import { applyMove, canApplyMove, createInitialState, DIRECTIONS, SNAKE_ENDS } from './physics'
import { GechoOutMove, GechoOutPuzzle, GechoOutState, Position } from './types'

const MAX_SOLO_NODES = 5000
const MAX_DFS_NODES = 5000

function serializeState(state: GechoOutState): string {
  const snakes = [...state.current]
    .sort((a, b) => a.id - b.id)
    .map((s) => `${s.id}:${s.cells.map((c) => `${c.row},${c.col}`).join('|')}`)
    .join(';')
  return `${snakes}#${[...state.cleared].sort((a, b) => a - b).join(',')}`
}

interface Candidate {
  move: GechoOutMove
  state: GechoOutState
}

function nextStates(state: GechoOutState): Candidate[] {
  const results: Candidate[] = []
  for (const snake of state.current) {
    for (const end of SNAKE_ENDS) {
      for (const direction of DIRECTIONS) {
        const move: GechoOutMove = { snakeId: snake.id, end, direction }
        if (!canApplyMove(state, move)) continue
        results.push({ move, state: applyMove(state, move) })
      }
    }
  }
  return results
}

// 他の蛇・障害物セルを固定障害物として扱い、対象の蛇1匹だけが穴に入るまでの最短手順をBFSで探す
function buildSoloState(state: GechoOutState, snakeId: number): GechoOutState {
  const snake = state.current.find((s) => s.id === snakeId)
  if (!snake) return { ...state, current: [] }

  const obstacles: Position[] = [...state.obstacles]
  for (const other of state.current) {
    if (other.id === snakeId) continue
    obstacles.push(...other.cells)
  }

  return { ...state, current: [snake], obstacles }
}

function solveSingleSnake(state: GechoOutState, snakeId: number): GechoOutMove[] | null {
  const solo = buildSoloState(state, snakeId)
  if (solo.current.length === 0) return []

  const visited = new Set<string>()
  visited.add(serializeState(solo))

  let queue: { state: GechoOutState; path: GechoOutMove[] }[] = [{ state: solo, path: [] }]
  let nodes = 0

  while (queue.length > 0) {
    const next: { state: GechoOutState; path: GechoOutMove[] }[] = []
    for (const { state: cur, path } of queue) {
      for (const candidate of nextStates(cur)) {
        if (++nodes > MAX_SOLO_NODES) return null
        const path2 = [...path, candidate.move]
        if (candidate.state.current.length === 0) return path2

        const key = serializeState(candidate.state)
        if (visited.has(key)) continue
        visited.add(key)
        next.push({ state: candidate.state, path: path2 })
      }
    }
    queue = next
  }

  return null
}

// 各ラウンドで「最短手数で穴に入れられる蛇」を1匹選んで実行する優先度付きプランニングで
// 全ての蛇を穴に入れる手順を求める。どの蛇も進められなければ解なし(null)
export function solve(puzzle: GechoOutPuzzle): GechoOutMove[] | null {
  let state = createInitialState(puzzle)
  const fullPath: GechoOutMove[] = []
  const maxRounds = state.current.length

  for (let round = 0; round < maxRounds && state.current.length > 0; round++) {
    let best: GechoOutMove[] | null = null

    for (const snake of state.current) {
      const moves = solveSingleSnake(state, snake.id)
      if (moves !== null && (best === null || moves.length < best.length)) {
        best = moves
      }
    }

    if (best === null) return null

    for (const move of best) {
      state = applyMove(state, move)
      fullPath.push(move)
    }
  }

  return state.current.length === 0 ? fullPath : null
}

// 解(全ての蛇を穴に入れる手順)が何通り存在するかをカウントする。
// 探索量が多くなりすぎないようlimit/ノード数で打ち切る。
export function countSolutions(puzzle: GechoOutPuzzle, limit = 2): number {
  const initial = createInitialState(puzzle)
  if (initial.current.length === 0) return 1

  let count = 0
  let nodes = 0

  let queue: GechoOutState[] = [initial]
  while (queue.length > 0 && count < limit && nodes < MAX_DFS_NODES) {
    const next: GechoOutState[] = []
    for (const state of queue) {
      for (const candidate of nextStates(state)) {
        if (count >= limit || nodes >= MAX_DFS_NODES) break
        nodes++
        if (candidate.state.current.length === 0) {
          count++
        } else {
          next.push(candidate.state)
        }
      }
    }
    queue = next
  }

  return count
}
