import { generate, solve, countSolutions, validate, createInitialState, getPlayableCards } from '../index'
import { Difficulty } from '../../../types/engine'

describe('Seven Engine', () => {
  describe('generate - all difficulties', () => {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    difficulties.forEach(diff => {
      it(`generates 10 puzzles for ${diff}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(diff, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(diff)
          expect(puzzle.seed).toBeGreaterThan(0)
          expect(puzzle.playerCount).toBeGreaterThanOrEqual(2)
          expect(puzzle.passLimit).toBeGreaterThan(0)
          const result = solve(puzzle)
          expect(result).not.toBeNull()
        }
      }, 30000)
    })
  })

  describe('seed reproduction', () => {
    it('returns same deal for same seed', () => {
      const p1 = generate('normal', 12345)
      const p2 = generate('normal', 12345)
      expect(p1.seed).toBe(p2.seed)
      const s1 = createInitialState(p1)
      const s2 = createInitialState(p2)
      expect(s1.hands).toEqual(s2.hands)
    })

    it('different seeds produce different deals', () => {
      const p1 = generate('easy', 1)
      const p2 = generate('easy', 99999)
      const s1 = createInitialState(p1)
      const s2 = createInitialState(p2)
      expect(s1.hands).not.toEqual(s2.hands)
    })
  })

  describe('countSolutions', () => {
    it('returns 1', () => {
      expect(countSolutions(generate('easy', 1))).toBe(1)
    })
  })

  describe('timing', () => {
    it('generates Normal puzzle in under 500ms', () => {
      const start = Date.now()
      generate('normal', 42)
      expect(Date.now() - start).toBeLessThan(500)
    })
  })

  describe('validate', () => {
    it('allows playing a 7 at start', () => {
      const puzzle = generate('easy', 1)
      const state = createInitialState(puzzle)
      const player0Hand = state.hands[0]
      const seven = player0Hand.find(c => c.rank === 7)
      if (seven) {
        const result = validate(state, { type: 'play', card: seven })
        expect(result.correct).toBe(true)
        expect(result.lifeLost).toBe(false)
      }
    })

    it('rejects playing non-7 on empty field', () => {
      const puzzle = generate('easy', 1)
      const state = createInitialState(puzzle)
      const player0Hand = state.hands[0]
      const nonSeven = player0Hand.find(c => c.rank !== 7)
      if (nonSeven) {
        const result = validate(state, { type: 'play', card: nonSeven })
        if (!state.field[nonSeven.suit].started) {
          expect(result.correct).toBe(false)
        }
      }
    })

    it('validates pass when no playable cards', () => {
      const puzzle = generate('easy', 1)
      const state = createInitialState(puzzle)
      const playable = getPlayableCards(state, state.currentPlayer)
      if (playable.length === 0) {
        const result = validate(state, { type: 'pass' })
        expect(result.correct).toBe(true)
      }
    })
  })

  describe('AI difficulties', () => {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    difficulties.forEach(diff => {
      it(`${diff} AI completes game`, () => {
        const puzzle = generate(diff, 42)
        const result = solve(puzzle)
        expect(result).not.toBeNull()
      }, 10000)
    })
  })
})
