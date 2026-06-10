import { Direction, GechoOutMove, GechoOutState, Position, Snake, SnakeEnd } from './types'

export const DIRECTION_DELTA: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

export const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right']
export const SNAKE_ENDS: SnakeEnd[] = ['head', 'tail']

export function isWithinBounds(pos: Position, size: number): boolean {
  return pos.row >= 0 && pos.row < size && pos.col >= 0 && pos.col < size
}

export function isObstacle(pos: Position, obstacles: Position[]): boolean {
  return obstacles.some((o) => o.row === pos.row && o.col === pos.col)
}

function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}

// snakeId(excludeSnakeId)を除く全ての蛇のセルとposが重なるか
export function isOccupiedByOtherSnake(pos: Position, snakes: Snake[], excludeSnakeId: number): boolean {
  return snakes.some((s) => s.id !== excludeSnakeId && s.cells.some((c) => samePos(c, pos)))
}

// 蛇自身の体(動かない側)とposが重なるか。動く側のセルは移動で消えるため除外する。
export function isOccupiedBySelf(pos: Position, snake: Snake, end: SnakeEnd): boolean {
  const body = end === 'head' ? snake.cells.slice(0, -1) : snake.cells.slice(1)
  return body.some((c) => samePos(c, pos))
}

// headまたはtailを1マス動かした新しい蛇を返す(純粋関数)
export function moveSnake(snake: Snake, end: SnakeEnd, direction: Direction): Snake {
  const delta = DIRECTION_DELTA[direction]
  const cells = snake.cells
  if (end === 'head') {
    const head = cells[cells.length - 1]
    const newHead: Position = { row: head.row + delta.row, col: head.col + delta.col }
    return { ...snake, cells: [...cells.slice(1), newHead] }
  }
  const tail = cells[0]
  const newTail: Position = { row: tail.row + delta.row, col: tail.col + delta.col }
  return { ...snake, cells: [newTail, ...cells.slice(0, -1)] }
}

function getEndPosition(snake: Snake, end: SnakeEnd): Position {
  return end === 'head' ? snake.cells[snake.cells.length - 1] : snake.cells[0]
}

function getTargetPosition(snake: Snake, end: SnakeEnd, direction: Direction): Position {
  const delta = DIRECTION_DELTA[direction]
  const from = getEndPosition(snake, end)
  return { row: from.row + delta.row, col: from.col + delta.col }
}

// 指定の手が現在の盤面状態で実行可能か判定する
export function canApplyMove(state: GechoOutState, move: GechoOutMove): boolean {
  const snake = state.current.find((s) => s.id === move.snakeId)
  if (!snake) return false

  const target = getTargetPosition(snake, move.end, move.direction)

  if (!isWithinBounds(target, state.size)) return false
  if (isObstacle(target, state.obstacles)) return false
  if (isOccupiedByOtherSnake(target, state.current, snake.id)) return false
  if (isOccupiedBySelf(target, snake, move.end)) return false

  return true
}

// 手を適用し新しい状態を返す(純粋関数)。移動先が対応する穴なら蛇と穴を消す。
export function applyMove(state: GechoOutState, move: GechoOutMove): GechoOutState {
  const snake = state.current.find((s) => s.id === move.snakeId)
  if (!snake) return state

  const target = getTargetPosition(snake, move.end, move.direction)
  const matchingHole = state.holes.find(
    (h) => h.color === snake.color && samePos(h.position, target) && !state.cleared.includes(h.color)
  )

  if (matchingHole) {
    return {
      ...state,
      current: state.current.filter((s) => s.id !== snake.id),
      cleared: [...state.cleared, snake.color],
      moveCount: state.moveCount + 1,
    }
  }

  const moved = moveSnake(snake, move.end, move.direction)
  return {
    ...state,
    current: state.current.map((s) => (s.id === snake.id ? moved : s)),
    moveCount: state.moveCount + 1,
  }
}

export function createInitialState(
  puzzle: Pick<GechoOutState, 'id' | 'size' | 'snakes' | 'holes' | 'obstacles' | 'difficulty' | 'seed'>
): GechoOutState {
  return {
    ...puzzle,
    current: puzzle.snakes,
    cleared: [],
    moveCount: 0,
  }
}
