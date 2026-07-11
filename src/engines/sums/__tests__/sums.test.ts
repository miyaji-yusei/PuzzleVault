import { generate, solve, countSolutions, validate } from '../index'
import { Difficulty } from '../../../types/engine'
import { SumsState, CellMark } from '../types'

function makeState(diff: Difficulty, seed: number): SumsState {
  const puzzle = generate(diff, seed)
  return {
    ...puzzle,
    current: Array.from({ length: 5 }, () => Array<CellMark>(5).fill(null)),
    mistakes: 0,
    startedAt: 0,
    elapsedSeconds: 0,
  }
}

describe('Sums Engine', () => {
  describe('generate - all difficulties', () => {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    difficulties.forEach(diff => {
      it(`generates 10 valid puzzles for ${diff}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(diff, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(diff)
          expect(puzzle.grid.length).toBe(5)
          expect(puzzle.grid[0]!.length).toBe(5)
          expect(puzzle.solution.length).toBe(5)
          expect(puzzle.rowSums.length).toBe(5)
          expect(puzzle.colSums.length).toBe(5)
          expect(puzzle.colorGroups.length).toBeGreaterThanOrEqual(3)
          // Verify solution satisfies constraints
          const result = solve(puzzle)
          expect(result).not.toBeNull()
        }
      }, 120000)
    })
  })

  describe('grid is always 5×5', () => {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    difficulties.forEach(diff => {
      it(`${diff} generates 5×5 grid`, () => {
        const p = generate(diff, 1)
        expect(p.grid.length).toBe(5)
        expect(p.grid[0]!.length).toBe(5)
      }, 30000)
    })
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
      const same = JSON.stringify(p1.grid) === JSON.stringify(p2.grid) &&
        JSON.stringify(p1.solution) === JSON.stringify(p2.solution)
      expect(same).toBe(false)
    }, 60000)
  })

  describe('countSolutions (uniqueness check)', () => {
    it('easy puzzle has exactly 1 solution', () => {
      const puzzle = generate('easy', 42)
      const count = countSolutions(puzzle)
      expect(count).toBe(1)
    }, 30000)

    it('normal puzzle has exactly 1 solution', () => {
      const puzzle = generate('normal', 42)
      const count = countSolutions(puzzle)
      expect(count).toBe(1)
    }, 60000)

    it('hard puzzle has at least 1 solution', () => {
      const puzzle = generate('hard', 42)
      const count = countSolutions(puzzle)
      expect(count).toBeGreaterThanOrEqual(1)
    }, 60000)
  })

  describe('color groups', () => {
    it('all cells assigned to exactly one group', () => {
      const puzzle = generate('normal', 1)
      const seen = new Set<string>()
      for (const group of puzzle.colorGroups) {
        for (const [r, c] of group.cells) {
          const key = `${r},${c}`
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
      }
      expect(seen.size).toBe(25)
    }, 30000)

    it('each group has a positive targetSum', () => {
      const puzzle = generate('easy', 1)
      for (const group of puzzle.colorGroups) {
        expect(group.targetSum).toBeGreaterThan(0)
      }
    }, 30000)
  })

  describe('timing', () => {
    it('generates Normal puzzle in under 500ms', () => {
      const start = Date.now()
      generate('normal', 12345)
      expect(Date.now() - start).toBeLessThan(500)
    }, 10000)
  })

  describe('validate', () => {
    it('accepts correct circle mark', () => {
      const state = makeState('easy', 1)
      let foundRow = -1, foundCol = -1
      outer: for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (state.solution[r]?.[c] === 'circle') {
            foundRow = r; foundCol = c; break outer
          }
        }
      }
      if (foundRow !== -1) {
        const result = validate(state, { row: foundRow, col: foundCol, mark: 'circle' })
        expect(result.correct).toBe(true)
        expect(result.lifeLost).toBe(false)
      }
    }, 30000)

    it('accepts correct cross mark', () => {
      const state = makeState('easy', 1)
      let foundRow = -1, foundCol = -1
      outer: for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (state.solution[r]?.[c] === 'cross') {
            foundRow = r; foundCol = c; break outer
          }
        }
      }
      if (foundRow !== -1) {
        const result = validate(state, { row: foundRow, col: foundCol, mark: 'cross' })
        expect(result.correct).toBe(true)
        expect(result.lifeLost).toBe(false)
      }
    }, 30000)

    it('rejects wrong mark (lifeLost)', () => {
      const state = makeState('easy', 1)
      let foundRow = -1, foundCol = -1
      let wrongMark: CellMark = 'circle'
      outer: for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (state.solution[r]?.[c] === 'circle') {
            foundRow = r; foundCol = c; wrongMark = 'cross'; break outer
          }
        }
      }
      if (foundRow !== -1) {
        const result = validate(state, { row: foundRow, col: foundCol, mark: wrongMark })
        expect(result.correct).toBe(false)
        expect(result.lifeLost).toBe(true)
      }
    }, 30000)

    it('null mark is always correct (empty cell)', () => {
      const state = makeState('easy', 1)
      const result = validate(state, { row: 0, col: 0, mark: null })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    }, 10000)

    it('detects isComplete when all cells correctly marked', () => {
      const puzzle = generate('easy', 1)
      const current: CellMark[][] = puzzle.solution.map(row =>
        row.map(m => m)
      )
      // Fill all but last cell
      const state: SumsState = {
        ...puzzle,
        current: current.map((row, r) =>
          row.map((m, c) => (r === 4 && c === 4 ? null : m))
        ),
        mistakes: 0,
        startedAt: 0,
        elapsedSeconds: 0,
      }
      const lastMark = puzzle.solution[4]?.[4] ?? 'circle'
      const result = validate(state, { row: 4, col: 4, mark: lastMark })
      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
    }, 30000)
  })

  describe('solve', () => {
    it('returns puzzle when solution is valid', () => {
      const puzzle = generate('easy', 1)
      expect(solve(puzzle)).not.toBeNull()
    }, 30000)
  })
})
