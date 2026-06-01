import { generate, solve, countSolutions, validate, dealState } from '../index'
import { Difficulty } from '../../../types/engine'

describe('Solitaire Engine', () => {
  describe('generate - easy/normal (solvable)', () => {
    const solvableDifficulties: Difficulty[] = ['easy', 'normal']
    solvableDifficulties.forEach(difficulty => {
      it(`generates 10 solvable puzzles for ${difficulty}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(difficulty, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(difficulty)
          expect(puzzle.seed).toBeGreaterThan(0)
          const result = solve(puzzle)
          expect(result).not.toBeNull()
        }
      }, 30000)
    })
  })

  describe('generate - hard/expert (structure check)', () => {
    const difficulties: Difficulty[] = ['hard', 'expert']
    difficulties.forEach(difficulty => {
      it(`generates 10 puzzles for ${difficulty}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(difficulty, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(difficulty)
          expect(puzzle.drawMode).toBe(3)
          expect(typeof puzzle.seed).toBe('number')
          expect(puzzle.id).toContain(difficulty)
        }
      }, 30000)
    })
  })

  describe('seed reproduction', () => {
    it('returns same puzzle for same seed', () => {
      const p1 = generate('normal', 12345)
      const p2 = generate('normal', 12345)
      expect(p1.seed).toBe(p2.seed)
      expect(p1.drawMode).toBe(p2.drawMode)
      const s1 = dealState(p1.seed, p1.drawMode)
      const s2 = dealState(p2.seed, p2.drawMode)
      expect(s1.tableau).toEqual(s2.tableau)
      expect(s1.stock).toEqual(s2.stock)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('easy', 1)
      const p2 = generate('easy', 100000)
      const s1 = dealState(p1.seed, p1.drawMode)
      const s2 = dealState(p2.seed, p2.drawMode)
      expect(s1.stock).not.toEqual(s2.stock)
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for solvable easy puzzle', () => {
      const puzzle = generate('easy', 42)
      expect(countSolutions(puzzle)).toBe(1)
    })
  })

  describe('timing', () => {
    it('generates Normal puzzle in under 500ms', () => {
      const start = Date.now()
      generate('normal', 99999)
      expect(Date.now() - start).toBeLessThan(500)
    })
  })

  describe('validate', () => {
    it('validates stock-draw correctly when stock has cards', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.drawMode)
      expect(state.stock.length).toBeGreaterThan(0)
      const result = validate(state, { type: 'stock-draw' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('rejects stock-reset when stock is not empty', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.drawMode)
      const result = validate(state, { type: 'stock-reset' })
      expect(result.correct).toBe(false)
    })

    it('validates tableau-to-tableau move', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.drawMode)
      // Top card of col 0 is face-up; try invalid move to self
      const result = validate(state, {
        type: 'tableau-to-tableau',
        from: { pile: 'tableau', index: 0 },
        to: { pile: 'tableau', index: 0 },
      })
      expect(result.correct).toBe(false)
    })

    it('validate returns isComplete false for incomplete state', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.drawMode)
      const result = validate(state, { type: 'stock-draw' })
      expect(result.isComplete).toBe(false)
    })
  })

  describe('drawMode', () => {
    it('generates draw-1 puzzles for easy and normal', () => {
      expect(generate('easy', 1).drawMode).toBe(1)
      expect(generate('normal', 1).drawMode).toBe(1)
    })

    it('generates draw-3 puzzles for hard and expert', () => {
      expect(generate('hard', 1).drawMode).toBe(3)
      expect(generate('expert', 1).drawMode).toBe(3)
    })
  })
})
