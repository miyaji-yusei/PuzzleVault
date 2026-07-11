import { Difficulty } from '../../types/engine'
export { Difficulty }

export interface Position {
  row: number
  col: number
}

export type SnakeEnd = 'head' | 'tail'
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Snake {
  id: number
  color: number
  // cells[0] = 尾(tail), cells[length - 1] = 頭(head)
  cells: Position[]
}

export interface Hole {
  color: number
  position: Position
}

export interface GechoOutPuzzle {
  id: string
  size: number
  snakes: Snake[]
  holes: Hole[]
  obstacles: Position[]
  difficulty: Difficulty
  seed: number
}

export interface GechoOutState extends GechoOutPuzzle {
  current: Snake[]
  cleared: number[] // クリア済みの色(蛇+穴が消えた色)
  moveCount: number
}

export interface GechoOutMove {
  snakeId: number
  end: SnakeEnd
  direction: Direction
}
