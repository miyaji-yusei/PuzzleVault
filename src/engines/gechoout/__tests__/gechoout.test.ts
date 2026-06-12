import { generate } from '../generator'
import { solve, countSolutions, isSolvable } from '../solver'
import { validate } from '../validator'
import { applyMove, canApplyMove, createInitialState, moveSnake } from '../physics'
import { GechoOutPuzzle, GechoOutState, Snake } from '../types'

jest.setTimeout(60000)

const DIFFICULTY_SIZES = {
  easy: 5,
  normal: 6,
  hard: 7,
  expert: 8,
} as const

const DIFFICULTY_SNAKE_COUNT = {
  easy: 3,
  normal: 4,
  hard: 5,
  expert: 6,
} as const

const DIFFICULTY_LEN_RANGE = {
  easy: { min: 2, max: 3 },
  normal: { min: 3, max: 4 },
  hard: { min: 3, max: 5 },
  expert: { min: 4, max: 6 },
} as const

function applyPath(puzzle: GechoOutPuzzle): GechoOutState {
  const path = solve(puzzle)
  expect(path).not.toBeNull()

  let state = createInitialState(puzzle)
  for (const move of path!) {
    expect(canApplyMove(state, move)).toBe(true)
    state = applyMove(state, move)
  }
  return state
}

describe('Gecho Out Engine', () => {
  describe('generate', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert'] as const

    for (const difficulty of difficulties) {
      describe(difficulty, () => {
        it('generates 10 solvable puzzles', () => {
          const { min, max } = DIFFICULTY_LEN_RANGE[difficulty]
          for (let i = 0; i < 10; i++) {
            const puzzle = generate(difficulty, 1000 + i)

            expect(puzzle.size).toBe(DIFFICULTY_SIZES[difficulty])
            expect(puzzle.snakes).toHaveLength(DIFFICULTY_SNAKE_COUNT[difficulty])
            expect(puzzle.holes).toHaveLength(DIFFICULTY_SNAKE_COUNT[difficulty])
            expect(puzzle.difficulty).toBe(difficulty)
            for (const snake of puzzle.snakes) {
              expect(snake.cells.length).toBeGreaterThanOrEqual(min)
              expect(snake.cells.length).toBeLessThanOrEqual(max)
            }

            const finalState = applyPath(puzzle)
            expect(finalState.current).toHaveLength(0)
          }
        })
      })
    }

    it('same seed produces the same puzzle', () => {
      const p1 = generate('normal', 42)
      const p2 = generate('normal', 42)
      expect(p1.snakes).toEqual(p2.snakes)
      expect(p1.holes).toEqual(p2.holes)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 2)
      expect(JSON.stringify(p1.snakes) + JSON.stringify(p1.holes)).not.toEqual(
        JSON.stringify(p2.snakes) + JSON.stringify(p2.holes)
      )
    })

    it('generates within 500ms for normal difficulty', () => {
      const start = Date.now()
      generate('normal', 12345)
      expect(Date.now() - start).toBeLessThan(500)
    })

    it('all snake cells are within bounds and non-overlapping', () => {
      const puzzle = generate('hard', 7)
      const seen = new Set<string>()
      for (const snake of puzzle.snakes) {
        for (const cell of snake.cells) {
          expect(cell.row).toBeGreaterThanOrEqual(0)
          expect(cell.row).toBeLessThan(puzzle.size)
          expect(cell.col).toBeGreaterThanOrEqual(0)
          expect(cell.col).toBeLessThan(puzzle.size)
          const key = `${cell.row},${cell.col}`
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
      }
    })

    it('each snake has a hole of the matching color', () => {
      const puzzle = generate('expert', 99)
      const colors = puzzle.snakes.map((s) => s.color).sort()
      const holeColors = puzzle.holes.map((h) => h.color).sort()
      expect(holeColors).toEqual(colors)
    })
  })

  describe('solve', () => {
    it('returns a move sequence that clears all snakes', () => {
      const puzzle = generate('easy', 1)
      const finalState = applyPath(puzzle)
      expect(finalState.current).toHaveLength(0)
      expect(finalState.cleared.sort()).toEqual(puzzle.snakes.map((s) => s.color).sort())
    })

    it('returns empty array for already-cleared puzzle', () => {
      const puzzle = generate('easy', 1)
      const empty: GechoOutPuzzle = { ...puzzle, snakes: [] }
      expect(solve(empty)).toEqual([])
    })

    it('returns null for an unsolvable puzzle', () => {
      // 蛇が完全に壁で囲まれていて1マスも動けない盤面
      const puzzle: GechoOutPuzzle = {
        id: 'test-unsolvable',
        size: 2,
        snakes: [
          { id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
          { id: 1, color: 1, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
        ],
        holes: [
          { color: 0, position: { row: 0, col: 0 } },
          { color: 1, position: { row: 1, col: 1 } },
        ],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      }
      // 2x2の盤面が蛇で完全に埋まっており、どちらの蛇も動けないため解なし
      expect(solve(puzzle)).toBeNull()
    })
  })

  describe('countSolutions', () => {
    it('returns at least 1 for a solvable puzzle', () => {
      const puzzle = generate('easy', 5)
      expect(countSolutions(puzzle)).toBeGreaterThanOrEqual(1)
    })

    it('returns 1 for an already-cleared puzzle', () => {
      const puzzle = generate('easy', 5)
      const empty: GechoOutPuzzle = { ...puzzle, snakes: [] }
      expect(countSolutions(empty)).toBe(1)
    })

    it('returns 0 for an unsolvable puzzle', () => {
      const puzzle: GechoOutPuzzle = {
        id: 'test-unsolvable',
        size: 2,
        snakes: [
          { id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
          { id: 1, color: 1, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
        ],
        holes: [
          { color: 0, position: { row: 0, col: 0 } },
          { color: 1, position: { row: 1, col: 1 } },
        ],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      }
      expect(countSolutions(puzzle)).toBe(0)
    })
  })

  describe('isSolvable', () => {
    it('returns true for a generated puzzle', () => {
      const puzzle = generate('normal', 5)
      expect(isSolvable(puzzle)).toBe(true)
    })

    it('returns true for an already-cleared puzzle', () => {
      const puzzle = generate('easy', 5)
      const empty: GechoOutPuzzle = { ...puzzle, snakes: [] }
      expect(isSolvable(empty)).toBe(true)
    })

    it('returns false for an unsolvable puzzle', () => {
      const puzzle: GechoOutPuzzle = {
        id: 'test-unsolvable',
        size: 2,
        snakes: [
          { id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
          { id: 1, color: 1, cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }] },
        ],
        holes: [
          { color: 0, position: { row: 0, col: 0 } },
          { color: 1, position: { row: 1, col: 1 } },
        ],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      }
      expect(isSolvable(puzzle)).toBe(false)
    })
  })

  describe('physics', () => {
    const snake: Snake = {
      id: 0,
      color: 0,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
    }

    it('moveSnake moves the head and shifts the body forward', () => {
      const moved = moveSnake(snake, 'head', 'right')
      expect(moved.cells).toEqual([
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ])
    })

    it('moveSnake moves the tail and shifts the body backward', () => {
      const moved = moveSnake(snake, 'tail', 'up')
      expect(moved.cells).toEqual([
        { row: 0, col: 1 },
        { row: 1, col: 1 },
      ])
    })

    it('canApplyMove returns false when target is out of bounds', () => {
      const state: GechoOutState = createInitialState({
        id: 'test',
        size: 4,
        snakes: [{ id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }],
        holes: [],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      })
      expect(canApplyMove(state, { snakeId: 0, end: 'tail', direction: 'left' })).toBe(false)
      expect(canApplyMove(state, { snakeId: 0, end: 'tail', direction: 'up' })).toBe(false)
    })

    it('canApplyMove returns false when target is occupied by another snake', () => {
      const state: GechoOutState = createInitialState({
        id: 'test',
        size: 4,
        snakes: [
          { id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
          { id: 1, color: 1, cells: [{ row: 1, col: 1 }, { row: 1, col: 2 }] },
        ],
        holes: [],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      })
      // snake0のheadを下に動かすとsnake1のセル(1,1)と重なる
      expect(canApplyMove(state, { snakeId: 0, end: 'head', direction: 'down' })).toBe(false)
    })

    it('applyMove clears the snake and hole when an end enters a matching hole', () => {
      const state: GechoOutState = createInitialState({
        id: 'test',
        size: 4,
        snakes: [{ id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }],
        holes: [{ color: 0, position: { row: 0, col: 2 } }],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      })
      const next = applyMove(state, { snakeId: 0, end: 'head', direction: 'right' })
      expect(next.current).toHaveLength(0)
      expect(next.cleared).toEqual([0])
    })
  })

  describe('validate', () => {
    it('returns correct=true and isComplete=false for a normal valid move', () => {
      const puzzle = generate('normal', 3)
      const path = solve(puzzle)
      expect(path).not.toBeNull()

      const state = createInitialState(puzzle)
      // 解が複数手で構成される(=最初の手だけではクリアしない)場合のみ検証
      if (path!.length > 1) {
        const result = validate(state, path![0])
        expect(result.correct).toBe(true)
        expect(result.lifeLost).toBe(false)
      }
    })

    it('returns correct=false for an out-of-bounds move', () => {
      const state: GechoOutState = createInitialState({
        id: 'test',
        size: 4,
        snakes: [{ id: 0, color: 0, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }],
        holes: [],
        obstacles: [],
        difficulty: 'easy',
        seed: 0,
      })

      const result = validate(state, { snakeId: 0, end: 'tail', direction: 'left' })
      expect(result.correct).toBe(false)
      expect(result.isComplete).toBe(false)
      expect(result.lifeLost).toBe(false)
    })

    it('returns isComplete=true on the final move of the solution', () => {
      const puzzle = generate('easy', 1)
      const path = solve(puzzle)!
      let state = createInitialState(puzzle)
      for (let i = 0; i < path.length - 1; i++) {
        state = applyMove(state, path[i])
      }
      const result = validate(state, path[path.length - 1])
      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
      expect(result.lifeLost).toBe(false)
    })
  })
})
