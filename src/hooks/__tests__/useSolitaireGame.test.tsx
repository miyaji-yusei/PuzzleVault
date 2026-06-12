import { findNextFoundationMove, hasValidMoves } from '../useSolitaireGame'
import { Card, SolitaireState } from '../../engines/solitaire/types'

function card(suit: Card['suit'], rank: Card['rank'], faceUp = true): Card {
  return { suit, rank, faceUp }
}

function makeState(overrides: Partial<SolitaireState>): SolitaireState {
  return {
    tableau: [[], [], [], [], [], [], []],
    foundation: [[], [], [], []],
    stock: [],
    waste: [],
    moves: 0,
    score: 0,
    stockResets: 0,
    startedAt: 0,
    elapsedSeconds: 0,
    ...overrides,
  }
}

describe('findNextFoundationMove', () => {
  it('returns null when no card can move to a foundation', () => {
    const state = makeState({
      tableau: [[card('spades', 5)], [], [], [], [], [], []],
    })
    expect(findNextFoundationMove(state)).toBeNull()
  })

  it('prioritizes waste over tableau when both can move to foundation', () => {
    const state = makeState({
      tableau: [[card('hearts', 1)], [], [], [], [], [], []],
      waste: [card('spades', 1)],
    })
    const result = findNextFoundationMove(state)
    expect(result?.move).toEqual({ type: 'waste-to-foundation' })
    expect(result?.anim).toEqual({
      card: card('spades', 1),
      from: { pile: 'waste' },
      to: { pile: 'foundation', index: 0 },
    })
  })

  it('returns the leftmost tableau column whose top card can move to its foundation', () => {
    const state = makeState({
      tableau: [[card('spades', 5)], [card('hearts', 1)], [], [], [], [], []],
    })
    const result = findNextFoundationMove(state)
    expect(result?.move).toEqual({ type: 'tableau-to-foundation', from: { pile: 'tableau', index: 1 } })
    expect(result?.anim).toEqual({
      card: card('hearts', 1),
      from: { pile: 'tableau', col: 1 },
      to: { pile: 'foundation', index: 1 },
    })
  })

  it('moves cards to foundation in ascending rank order (A then 2)', () => {
    const afterAce = makeState({
      tableau: [[card('clubs', 2)], [], [], [], [], [], []],
      foundation: [[], [], [], [card('clubs', 1)]],
    })
    const result = findNextFoundationMove(afterAce)
    expect(result?.anim.card).toEqual(card('clubs', 2))
    expect(result?.anim.to).toEqual({ pile: 'foundation', index: 3 })
  })
})

describe('hasValidMoves', () => {
  it('does not treat moving a whole column onto an empty column as a valid move', () => {
    // The only "move" available without this fix is shuffling the lone King
    // between empty columns, which never changes the board, so this is a
    // genuine deadlock.
    const state = makeState({
      tableau: [
        [card('spades', 13)],
        [],
        [card('hearts', 5)],
        [card('clubs', 7)],
        [card('diamonds', 9, false)],
        [],
        [],
      ],
    })
    expect(hasValidMoves(state)).toBe(false)
  })

  it('still recognizes a real move onto an empty column (partial sequence)', () => {
    const state = makeState({
      tableau: [
        [card('clubs', 9, false), card('spades', 13)],
        [],
        [card('hearts', 5)],
        [],
        [],
        [],
        [],
      ],
    })
    expect(hasValidMoves(state)).toBe(true)
  })

  it('treats remaining waste cards as a valid move regardless of stockResets count', () => {
    // No tableau move is possible, but the waste pile can always be reset into
    // the stock again (resets are unlimited), so this is not a deadlock.
    const state = makeState({
      tableau: [
        [card('spades', 13)],
        [],
        [card('hearts', 5)],
        [card('clubs', 7)],
        [card('diamonds', 9, false)],
        [],
        [],
      ],
      waste: [card('hearts', 1)],
      stockResets: 999,
    })
    expect(hasValidMoves(state)).toBe(true)
  })
})
