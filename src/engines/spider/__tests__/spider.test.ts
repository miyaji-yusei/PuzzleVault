import { generate, solve, countSolutions, validate, dealState } from '../index'
import { Difficulty } from '../../../types/engine'

describe('Spider Engine', () => {
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
      }, 120000)
    })
  })

  describe('generate - hard/expert (structure check)', () => {
    const difficulties: Difficulty[] = ['hard', 'expert']
    difficulties.forEach(difficulty => {
      it(`generates 10 puzzles for ${difficulty}`, () => {
        for (let i = 0; i < 10; i++) {
          const puzzle = generate(difficulty, i * 1000 + 1)
          expect(puzzle.difficulty).toBe(difficulty)
          expect(puzzle.suitCount).toBe(4)
          expect(typeof puzzle.seed).toBe('number')
          expect(puzzle.id).toContain(difficulty)
        }
      }, 30000)
    })
  })

  describe('seed reproduction', () => {
    it('returns same deal for same seed', () => {
      const p1 = generate('easy', 42)
      const p2 = generate('easy', 42)
      expect(p1.seed).toBe(p2.seed)
      const s1 = dealState(p1.seed, p1.suitCount)
      const s2 = dealState(p2.seed, p2.suitCount)
      expect(s1.tableau).toEqual(s2.tableau)
      expect(s1.stock).toEqual(s2.stock)
    })

    it('different seeds produce different deals', () => {
      const p1 = generate('easy', 1)
      const p2 = generate('easy', 99999)
      const s1 = dealState(p1.seed, p1.suitCount)
      const s2 = dealState(p2.seed, p2.suitCount)
      expect(s1.tableau).not.toEqual(s2.tableau)
    })
  })

  describe('suit count', () => {
    it('easy uses 1 suit (spades only)', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      expect(puzzle.suitCount).toBe(1)
      const allSpades = state.tableau.every(col =>
        col.every(card => card.suit === 'spades')
      )
      expect(allSpades).toBe(true)
    })

    it('normal uses 2 suits', () => {
      const puzzle = generate('normal', 1)
      expect(puzzle.suitCount).toBe(2)
    })

    it('hard and expert use 4 suits', () => {
      expect(generate('hard', 1).suitCount).toBe(4)
      expect(generate('expert', 1).suitCount).toBe(4)
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for solvable easy puzzle', () => {
      const puzzle = generate('easy', 42)
      expect(countSolutions(puzzle)).toBe(1)
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
    it('accepts deal when no empty columns and stock available', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      const result = validate(state, { type: 'deal' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('rejects deal when empty column exists', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      state.tableau[0] = []
      const result = validate(state, { type: 'deal' })
      expect(result.correct).toBe(false)
    })

    it('rejects deal when stock is empty', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      state.stock = []
      const result = validate(state, { type: 'deal' })
      expect(result.correct).toBe(false)
    })

    it('rejects move from same column to same column', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      const colLen = state.tableau[0].length
      const result = validate(state, {
        type: 'move',
        from: { col: 0, cardIndex: colLen - 1 },
        to: { col: 0 },
      })
      expect(result.correct).toBe(false)
    })

    it('rejects move of face-down card', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      const result = validate(state, {
        type: 'move',
        from: { col: 0, cardIndex: 0 },
        to: { col: 1 },
      })
      expect(result.correct).toBe(false)
    })

    it('accepts valid move to empty column', () => {
      const puzzle = generate('easy', 1)
      const state = dealState(puzzle.seed, puzzle.suitCount)
      // Force an empty column
      const movedCards = [...state.tableau[1]]
      state.tableau[9] = [...state.tableau[9], ...movedCards]
      state.tableau[1] = []
      // Move top card of col 0 to empty col 1
      const colLen = state.tableau[0].length
      const result = validate(state, {
        type: 'move',
        from: { col: 0, cardIndex: colLen - 1 },
        to: { col: 1 },
      })
      expect(result.correct).toBe(true)
    })
  })
})
