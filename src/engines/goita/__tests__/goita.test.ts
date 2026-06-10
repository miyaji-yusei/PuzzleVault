import { deal, createInitialState } from '../dealer'
import { chooseMove } from '../ai'
import { applyLead, getLegalLeadMoves, getWinningTeam, isGameOver, teamOf } from '../rules'
import { GoitaState, PIECE_COUNTS, PIECE_TYPES, PieceType, TOTAL_PIECE_COUNT } from '../types'

jest.setTimeout(60000)

function makeState(overrides: Partial<GoitaState> = {}): GoitaState {
  return {
    hands: [[], [], [], []],
    board: null,
    currentPlayer: 0,
    teams: [[0, 2], [1, 3]],
    captured: [[], [], [], []],
    finished: false,
    winningTeam: null,
    seed: 0,
    ...overrides,
  }
}

function piece(type: PieceType) {
  return { type, faceUp: false }
}

describe('Goita Engine', () => {
  describe('dealer', () => {
    it('deals 10 pieces to each of the 4 players', () => {
      const hands = deal(1)
      expect(hands).toHaveLength(4)
      for (const hand of hands) {
        expect(hand).toHaveLength(10)
      }
    })

    it('deals exactly TOTAL_PIECE_COUNT(40) pieces matching PIECE_COUNTS', () => {
      const hands = deal(2)
      const all = hands.flat()
      expect(all).toHaveLength(TOTAL_PIECE_COUNT)
      expect(TOTAL_PIECE_COUNT).toBe(40)

      const counts: Record<string, number> = {}
      for (const p of all) counts[p.type] = (counts[p.type] ?? 0) + 1
      for (const type of PIECE_TYPES) {
        expect(counts[type]).toBe(PIECE_COUNTS[type])
      }
    })

    it('same seed produces the same deal', () => {
      const a = deal(42)
      const b = deal(42)
      expect(a).toEqual(b)
    })

    it('different seeds produce different deals', () => {
      const a = deal(1)
      const b = deal(2)
      expect(a).not.toEqual(b)
    })

    it('createInitialState sets up a fresh game', () => {
      const state = createInitialState(7)
      expect(state.hands).toHaveLength(4)
      expect(state.hands.every((h) => h.length === 10)).toBe(true)
      expect(state.currentPlayer).toBe(0)
      expect(state.board).toBeNull()
      expect(state.finished).toBe(false)
      expect(state.winningTeam).toBeNull()
    })
  })

  describe('rules', () => {
    it('getLegalLeadMoves returns all hand indices of the current player', () => {
      const state = makeState({
        hands: [[piece('pawn'), piece('gold'), piece('king')], [], [], []],
        currentPlayer: 0,
      })
      expect(getLegalLeadMoves(state)).toEqual([0, 1, 2])
    })

    it('getLegalLeadMoves returns empty array when the game is finished', () => {
      const state = makeState({ finished: true, winningTeam: 0 })
      expect(getLegalLeadMoves(state)).toEqual([])
    })

    it('captures the led piece when the next player holds a matching type', () => {
      const state = makeState({
        hands: [
          [piece('pawn'), piece('gold')],
          [piece('silver'), piece('silver')],
          [piece('pawn'), piece('lance')],
          [piece('knight'), piece('knight')],
        ],
        currentPlayer: 0,
      })

      const next = applyLead(state, 0) // 0番が歩兵を出す

      expect(next.hands[0]).toEqual([piece('gold')])
      expect(next.hands[2]).toEqual([piece('lance')])
      expect(next.captured[2].sort()).toEqual(['pawn', 'pawn'])
      expect(next.currentPlayer).toBe(2)
      expect(next.board).toBeNull()
      expect(next.finished).toBe(false)
    })

    it('passes (流れる) when nobody holds a matching type, and the leader leads again', () => {
      const state = makeState({
        hands: [
          [piece('pawn'), piece('gold')],
          [piece('silver'), piece('silver')],
          [piece('lance'), piece('lance')],
          [piece('knight'), piece('knight')],
        ],
        currentPlayer: 0,
      })

      const next = applyLead(state, 0) // 0番が歩兵を出すが誰も取れない

      expect(next.hands[0]).toEqual([piece('gold')])
      expect(next.currentPlayer).toBe(0)
      expect(next.board).toBeNull()
      expect(next.captured.every((c) => c.length === 0)).toBe(true)
    })

    it('finishes the game when the leader empties their hand', () => {
      const state = makeState({
        hands: [
          [piece('pawn')],
          [piece('silver')],
          [piece('lance')],
          [piece('knight')],
        ],
        currentPlayer: 0,
      })

      const next = applyLead(state, 0)

      expect(next.finished).toBe(true)
      expect(next.winningTeam).toBe(teamOf(state, 0))
      expect(isGameOver(next)).toBe(true)
      expect(getWinningTeam(next)).toBe(0)
    })

    it('finishes the game when the capturer empties their hand', () => {
      const state = makeState({
        hands: [
          [piece('pawn'), piece('gold')],
          [piece('silver')],
          [piece('pawn')],
          [piece('knight')],
        ],
        currentPlayer: 0,
      })

      const next = applyLead(state, 0)

      expect(next.hands[2]).toEqual([])
      expect(next.finished).toBe(true)
      expect(next.winningTeam).toBe(teamOf(state, 2))
    })
  })

  describe('ai', () => {
    it('easy difficulty plays the lowest-value piece in hand', () => {
      const state = makeState({
        hands: [
          [piece('king'), piece('pawn'), piece('gold')],
          [piece('silver')],
          [piece('lance')],
          [piece('knight')],
        ],
        currentPlayer: 0,
      })

      const move = chooseMove(state, 'easy')
      expect(move).toBe(1) // pawn は最も価値が低い
    })

    it('chooseMove returns a legal move for normal and hard difficulties', () => {
      const state = createInitialState(10)
      for (const difficulty of ['normal', 'hard'] as const) {
        const move = chooseMove(state, difficulty)
        expect(getLegalLeadMoves(state)).toContain(move)
      }
    })

    it('chooseMove returns the only legal move when hand has a single piece', () => {
      const state = makeState({
        hands: [[piece('gold')], [piece('silver')], [piece('lance')], [piece('knight')]],
        currentPlayer: 0,
      })
      expect(chooseMove(state, 'easy')).toBe(0)
      expect(chooseMove(state, 'normal')).toBe(0)
      expect(chooseMove(state, 'hard')).toBe(0)
    })
  })

  describe('simulation', () => {
    it('an AI vs AI game (easy) reaches a finished state with an empty hand', () => {
      let state = createInitialState(123)
      let iterations = 0
      const MAX_ITERATIONS = 2000

      while (!state.finished && iterations < MAX_ITERATIONS) {
        const move = chooseMove(state, 'easy')
        expect(getLegalLeadMoves(state)).toContain(move)
        state = applyLead(state, move)
        iterations++
      }

      expect(state.finished).toBe(true)
      expect(state.hands.some((h) => h.length === 0)).toBe(true)
      expect(state.winningTeam === 0 || state.winningTeam === 1).toBe(true)
      expect(iterations).toBeLessThan(MAX_ITERATIONS)
    })

    it('an AI vs AI game (normal/hard mix) plays only legal moves for several rounds', () => {
      let state = createInitialState(456)
      const difficulties = ['normal', 'hard', 'easy', 'normal'] as const

      for (let i = 0; i < 15 && !state.finished; i++) {
        const difficulty = difficulties[state.currentPlayer]
        const move = chooseMove(state, difficulty)
        expect(getLegalLeadMoves(state)).toContain(move)
        state = applyLead(state, move)
      }
    })
  })
})
