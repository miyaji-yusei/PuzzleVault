export { generate } from './generator'
export { solve, countSolutions } from './solver'
export { validate } from './validator'
export {
  applyMove,
  canApplyMove,
  createInitialState,
  DIRECTION_DELTA,
  DIRECTIONS,
  isObstacle,
  isOccupiedByOtherSnake,
  isOccupiedBySelf,
  isWithinBounds,
  moveSnake,
  SNAKE_ENDS,
} from './physics'
export type {
  Difficulty,
  Direction,
  GechoOutMove,
  GechoOutPuzzle,
  GechoOutState,
  Hole,
  Position,
  Snake,
  SnakeEnd,
} from './types'
