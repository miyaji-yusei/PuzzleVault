import { generate, solve, countSolutions, validate } from '../index'
import { Difficulty } from '../../../types/engine'

describe('Hashi Engine', () => {
  describe('generate - all difficulties', () => {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    difficulties.forEach(diff => {
      it(`generates 10 puzzles for ${diff}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(diff, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(diff)
          expect(puzzle.islands.length).toBeGreaterThan(0)
          expect(puzzle.solution.length).toBeGreaterThan(0)
          expect(typeof puzzle.gridSize).toBe('number')
          const result = solve(puzzle)
          expect(result).not.toBeNull()
        }
      }, 60000)
    })
  })

  describe('seed reproduction', () => {
    it('returns same puzzle for same seed', () => {
      const p1 = generate('easy', 42)
      const p2 = generate('easy', 42)
      expect(p1.islands).toEqual(p2.islands)
      expect(p1.solution).toEqual(p2.solution)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('easy', 1)
      const p2 = generate('easy', 50000)
      expect(p1.islands).not.toEqual(p2.islands)
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for unique easy puzzle', () => {
      const puzzle = generate('easy', 100)
      expect(countSolutions(puzzle)).toBe(1)
    }, 15000)
  })

  describe('timing', () => {
    it('generates Normal puzzle in under 500ms', () => {
      const start = Date.now()
      generate('normal', 12345)
      expect(Date.now() - start).toBeLessThan(500)
    }, 10000)
  })

  describe('validate', () => {
    it('accepts valid bridge addition', () => {
      const puzzle = generate('easy', 1)
      const state = { ...puzzle, current: [], mistakes: 0, hintsUsed: 0, startedAt: 0, elapsedSeconds: 0 }
      const bridge = puzzle.solution[0]
      const result = validate(state, { fromIslandId: bridge.from, toIslandId: bridge.to, action: 'add' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('rejects bridge between non-adjacent islands', () => {
      const puzzle = generate('easy', 1)
      const state = { ...puzzle, current: [], mistakes: 0, hintsUsed: 0, startedAt: 0, elapsedSeconds: 0 }
      const result = validate(state, { fromIslandId: 9999, toIslandId: 9998, action: 'add' })
      expect(result.correct).toBe(false)
    })
  })
})
