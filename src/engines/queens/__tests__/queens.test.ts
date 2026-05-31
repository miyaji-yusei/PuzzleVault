import { generate } from '../generator'
import { solve, countSolutions } from '../solver'
import { validate } from '../validator'
import { QueensPuzzle, QueensState, CellState } from '../types'

jest.setTimeout(60000)

const DIFFICULTY_SIZES = {
  easy: 6,
  normal: 8,
  hard: 10,
  expert: 12,
} as const

describe('Queens Engine', () => {
  describe('generate', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert'] as const

    for (const difficulty of difficulties) {
      describe(difficulty, () => {
        it('generates 10 solvable puzzles', () => {
          for (let i = 0; i < 10; i++) {
            const puzzle = generate(difficulty, 1000 + i)
            expect(puzzle.regions).toBeDefined()
            expect(puzzle.solution).toBeDefined()
            expect(puzzle.difficulty).toBe(difficulty)
            expect(puzzle.size).toBe(DIFFICULTY_SIZES[difficulty])

            const solved = solve(puzzle)
            expect(solved).not.toBeNull()
          }
        })
      })
    }

    it('same seed produces the same puzzle', () => {
      const p1 = generate('normal', 42)
      const p2 = generate('normal', 42)
      expect(p1.regions).toEqual(p2.regions)
      expect(p1.solution).toEqual(p2.solution)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 2)
      // regions or solution should differ
      expect(JSON.stringify(p1.regions) + JSON.stringify(p1.solution)).not.toEqual(
        JSON.stringify(p2.regions) + JSON.stringify(p2.solution)
      )
    })

    it('generates within 500ms for normal difficulty', () => {
      const start = Date.now()
      generate('normal', 12345)
      expect(Date.now() - start).toBeLessThan(500)
    })

    it('puzzle has correct grid size', () => {
      const puzzle = generate('easy', 7)
      expect(puzzle.regions.length).toBe(6)
      expect(puzzle.regions[0].length).toBe(6)
    })

    it('all cells are assigned a color in regions', () => {
      const puzzle = generate('normal', 99)
      const { size, regions } = puzzle
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          expect(regions[r][c]).toBeGreaterThanOrEqual(0)
          expect(regions[r][c]).toBeLessThan(size)
        }
      }
    })

    it('solution has exactly one queen per row', () => {
      const puzzle = generate('normal', 55)
      const { size, solution } = puzzle
      for (let r = 0; r < size; r++) {
        const queensInRow = solution[r].filter(v => v).length
        expect(queensInRow).toBe(1)
      }
    })

    it('solution has exactly one queen per column', () => {
      const puzzle = generate('normal', 55)
      const { size, solution } = puzzle
      for (let c = 0; c < size; c++) {
        const queensInCol = solution.filter(row => row[c]).length
        expect(queensInCol).toBe(1)
      }
    })

    it('queens in solution are not diagonally adjacent', () => {
      const puzzle = generate('hard', 77)
      const { size, solution } = puzzle
      const queens: [number, number][] = []
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (solution[r][c]) queens.push([r, c])
        }
      }
      for (let i = 0; i < queens.length; i++) {
        for (let j = i + 1; j < queens.length; j++) {
          const [r1, c1] = queens[i]
          const [r2, c2] = queens[j]
          // Must NOT be in same row, column, or diagonally adjacent
          expect(Math.abs(r1 - r2) === 1 && Math.abs(c1 - c2) === 1).toBe(false)
        }
      }
    })
  })

  describe('solve', () => {
    it('solves a generated puzzle', () => {
      const puzzle = generate('easy', 1)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      // All queens placed
      const queenCount = solved!.solution.flat().filter(v => v).length
      expect(queenCount).toBe(puzzle.size)
    })

    it('solved solution matches original solution', () => {
      const puzzle = generate('normal', 2)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      expect(solved!.solution).toEqual(puzzle.solution)
    })

    it('returns null for unsolvable puzzle', () => {
      // Create a puzzle with empty regions where no valid placement exists
      const size = 4
      // All cells same color — only 1 color but need 4 queens (one per color)
      const regions = Array.from({ length: size }, () =>
        Array(size).fill(0) as number[]
      )
      const solution = Array.from({ length: size }, () =>
        Array(size).fill(false) as boolean[]
      )
      const puzzle: QueensPuzzle = {
        id: 'test-unsolvable',
        size,
        regions,
        solution,
        difficulty: 'easy',
        seed: 0,
      }
      expect(solve(puzzle)).toBeNull()
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for a generated puzzle', () => {
      const puzzle = generate('normal', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns 1 for easy puzzle', () => {
      const puzzle = generate('easy', 42)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns 1 for hard puzzle', () => {
      const puzzle = generate('hard', 7)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns more than 1 for a non-unique regions layout', () => {
      // 4x4 grid with quadrant colors - has multiple valid placements:
      // (0,2),(1,0),(2,3),(3,1) and (0,1),(1,3),(2,0),(3,2) are both valid
      const size = 4
      const regions = [
        [0, 0, 1, 1],
        [0, 0, 1, 1],
        [2, 2, 3, 3],
        [2, 2, 3, 3],
      ]
      const solution = Array.from({ length: size }, () =>
        Array(size).fill(false) as boolean[]
      )
      const puzzle: QueensPuzzle = {
        id: 'test-multi',
        size,
        regions,
        solution,
        difficulty: 'easy',
        seed: 0,
      }
      expect(countSolutions(puzzle)).toBeGreaterThan(1)
    })
  })

  describe('validate', () => {
    const buildState = (puzzle: QueensPuzzle): QueensState => ({
      ...puzzle,
      current: Array.from({ length: puzzle.size }, () =>
        Array(puzzle.size).fill('empty') as CellState[]
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })

    const findQueenCell = (puzzle: QueensPuzzle): [number, number] => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c]) return [r, c]
        }
      }
      throw new Error('no queen cell')
    }

    const findNonQueenCell = (puzzle: QueensPuzzle): [number, number] => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (!puzzle.solution[r][c]) return [r, c]
        }
      }
      throw new Error('no non-queen cell')
    }

    it('returns correct=true for placing queen on correct cell', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findQueenCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, state: 'queen' })

      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('returns correct=false and lifeLost=true for placing queen on wrong cell', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findNonQueenCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, state: 'queen' })

      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(true)
    })

    it('crossed move never loses a life', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findNonQueenCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, state: 'crossed' })

      expect(result.lifeLost).toBe(false)
      expect(result.isComplete).toBe(false)
    })

    it('empty move never loses a life', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findQueenCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, state: 'empty' })

      expect(result.lifeLost).toBe(false)
    })

    it('detects puzzle completion when all queens are placed', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)
      const { size, solution } = puzzle

      // Place all queens except last one
      const queenCells: [number, number][] = []
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (solution[r][c]) queenCells.push([r, c])
        }
      }

      // Fill all but the last queen
      for (let i = 0; i < queenCells.length - 1; i++) {
        const [r, c] = queenCells[i]
        state.current[r][c] = 'queen'
      }

      // Place the last queen
      const [lastRow, lastCol] = queenCells[queenCells.length - 1]
      const result = validate(state, { row: lastRow, col: lastCol, state: 'queen' })

      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
    })
  })
})
