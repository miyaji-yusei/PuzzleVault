import { generate, solve, countSolutions, validate } from '../index'
import { Difficulty } from '../../../types/engine'
import { SumsState } from '../types'

describe('Sums Engine', () => {
  describe('generate - all difficulties', () => {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    difficulties.forEach(diff => {
      it(`generates 10 solvable puzzles for ${diff}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(diff, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(diff)
          expect(puzzle.size).toBeGreaterThan(0)
          expect(puzzle.grid.length).toBe(puzzle.size)
          expect(puzzle.solution.length).toBe(puzzle.size)
          const result = solve(puzzle)
          expect(result).not.toBeNull()
        }
      }, 120000)
    })
  })

  describe('grid sizes by difficulty', () => {
    it('easy generates 4×4 grid', () => {
      const p = generate('easy', 1)
      expect(p.size).toBe(4)
    }, 30000)

    it('normal generates 5×5 grid', () => {
      const p = generate('normal', 1)
      expect(p.size).toBe(5)
    }, 30000)

    it('hard generates 6×6 grid', () => {
      const p = generate('hard', 1)
      expect(p.size).toBe(6)
    }, 30000)

    it('expert generates 8×8 grid', () => {
      const p = generate('expert', 1)
      expect(p.size).toBe(8)
    }, 120000)
  })

  describe('seed reproduction', () => {
    it('returns same puzzle for same seed', () => {
      const p1 = generate('easy', 42)
      const p2 = generate('easy', 42)
      expect(p1.seed).toBe(p2.seed)
      expect(p1.grid).toEqual(p2.grid)
      expect(p1.solution).toEqual(p2.solution)
    }, 30000)

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 99999)
      expect(p1.grid).not.toEqual(p2.grid)
    }, 60000)
  })

  describe('countSolutions (uniqueness check)', () => {
    it('easy puzzle has exactly 1 solution', () => {
      const puzzle = generate('easy', 42)
      expect(countSolutions(puzzle)).toBe(1)
    }, 30000)

    it('normal puzzle has exactly 1 solution', () => {
      const puzzle = generate('normal', 42)
      expect(countSolutions(puzzle)).toBe(1)
    }, 60000)

    it('hard puzzle has at least 1 solution', () => {
      const puzzle = generate('hard', 42)
      const count = countSolutions(puzzle)
      expect(count).toBeGreaterThanOrEqual(1)
    }, 60000)
  })

  describe('timing', () => {
    it('generates Normal puzzle in under 500ms', () => {
      const start = Date.now()
      generate('normal', 12345)
      expect(Date.now() - start).toBeLessThan(500)
    }, 10000)
  })

  describe('validate', () => {
    function makeState(diff: Difficulty, seed: number): SumsState {
      const puzzle = generate(diff, seed)
      return {
        ...puzzle,
        current: Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(null)),
        notes: Array.from({ length: puzzle.size }, () =>
          Array.from({ length: puzzle.size }, () => new Set<number>())
        ),
        mistakes: 0,
        hintsUsed: 0,
        startedAt: 0,
        elapsedSeconds: 0,
      }
    }

    it('accepts correct answer', () => {
      const state = makeState('easy', 1)
      let foundRow = -1, foundCol = -1, foundVal = 0
      outer: for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
          if (state.grid[r]?.[c]?.type === 'white') {
            const v = state.solution[r]?.[c]
            if (v != null) { foundRow = r; foundCol = c; foundVal = v; break outer }
          }
        }
      }
      if (foundRow !== -1) {
        const result = validate(state, { row: foundRow, col: foundCol, value: foundVal as (1|2|3|4|5|6|7|8|9), isNote: false })
        expect(result.correct).toBe(true)
        expect(result.lifeLost).toBe(false)
      }
    }, 30000)

    it('rejects wrong answer (lifeLost)', () => {
      const state = makeState('easy', 1)
      let foundRow = -1, foundCol = -1, wrongVal = 1
      outer: for (let r = 0; r < state.size; r++) {
        for (let c = 0; c < state.size; c++) {
          if (state.grid[r]?.[c]?.type === 'white') {
            const v = state.solution[r]?.[c]
            if (v != null) {
              foundRow = r; foundCol = c
              wrongVal = v === 9 ? 1 : (v as number) + 1
              break outer
            }
          }
        }
      }
      if (foundRow !== -1) {
        const result = validate(state, { row: foundRow, col: foundCol, value: wrongVal as (1|2|3|4|5|6|7|8|9), isNote: false })
        expect(result.correct).toBe(false)
        expect(result.lifeLost).toBe(true)
      }
    }, 30000)

    it('accepts note move without lifeLost', () => {
      const state = makeState('easy', 1)
      const result = validate(state, { row: 1, col: 1, value: 5, isNote: true })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    }, 10000)
  })
})
