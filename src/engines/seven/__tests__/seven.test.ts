import { chooseMove } from '../ai'
import { createDeck, createInitialState } from '../dealer'
import { applyDiscardAndDraw, canDiscard, cardValue, handValue } from '../rules'
import { Card, Difficulty, SevenState } from '../types'

jest.setTimeout(60000)

function makeState(overrides: Partial<SevenState> = {}): SevenState {
  const top: Card = { suit: 'spades', rank: 5 }
  return {
    deck: [],
    hands: [[], []],
    discard: [top],
    previousTop: top,
    currentPlayer: 0,
    phase: 'playing',
    winner: null,
    seed: 0,
    ...overrides,
  }
}

describe('Seven Engine', () => {
  describe('dealer', () => {
    it('creates a 54-card deck (52 cards + 2 jokers)', () => {
      const deck = createDeck()
      expect(deck).toHaveLength(54)
      expect(deck.filter((c) => c.suit === 'joker')).toHaveLength(2)
    })

    it('deals 7 cards to each of the 2 players', () => {
      const state = createInitialState(1)
      expect(state.hands[0]).toHaveLength(7)
      expect(state.hands[1]).toHaveLength(7)
    })

    it('initial discard pile has exactly 1 non-joker card', () => {
      for (let seed = 0; seed < 20; seed++) {
        const state = createInitialState(seed)
        expect(state.discard).toHaveLength(1)
        expect(state.discard[0]?.suit).not.toBe('joker')
        expect(state.previousTop).toEqual(state.discard[0])
      }
    })

    it('player starts the game', () => {
      const state = createInitialState(1)
      expect(state.currentPlayer).toBe(0)
      expect(state.phase).toBe('playing')
      expect(state.winner).toBeNull()
    })

    it('deals exactly 54 cards across hands, deck and discard', () => {
      const state = createInitialState(7)
      const total = state.hands[0].length + state.hands[1].length + state.deck.length + state.discard.length
      expect(total).toBe(54)
    })

    it('same seed produces the same initial state', () => {
      const a = createInitialState(42)
      const b = createInitialState(42)
      expect(a).toEqual(b)
    })

    it('different seeds produce different initial states', () => {
      const a = createInitialState(1)
      const b = createInitialState(2)
      expect(a).not.toEqual(b)
    })

    it('creates 10 initial states within 500ms', () => {
      const start = Date.now()
      for (let seed = 0; seed < 10; seed++) {
        createInitialState(seed)
      }
      expect(Date.now() - start).toBeLessThan(500)
    })
  })

  describe('rules', () => {
    it('cardValue: joker is 0, other cards are their rank', () => {
      expect(cardValue({ suit: 'joker', rank: 0 })).toBe(0)
      expect(cardValue({ suit: 'spades', rank: 1 })).toBe(1)
      expect(cardValue({ suit: 'hearts', rank: 13 })).toBe(13)
    })

    it('handValue sums card values', () => {
      const hand: Card[] = [{ suit: 'spades', rank: 3 }, { suit: 'joker', rank: 0 }, { suit: 'hearts', rank: 4 }]
      expect(handValue(hand)).toBe(7)
    })

    it('canDiscard requires at least one card and all the same rank', () => {
      const hand: Card[] = [{ suit: 'spades', rank: 5 }, { suit: 'hearts', rank: 5 }, { suit: 'clubs', rank: 9 }]
      expect(canDiscard(hand, [0, 1])).toBe(true)
      expect(canDiscard(hand, [0])).toBe(true)
      expect(canDiscard(hand, [0, 2])).toBe(false)
      expect(canDiscard(hand, [])).toBe(false)
      expect(canDiscard(hand, [0, 0])).toBe(false)
    })

    it('discards the selected cards and draws one from the deck', () => {
      const state = makeState({
        hands: [[{ suit: 'spades', rank: 9 }, { suit: 'hearts', rank: 9 }], []],
        deck: [{ suit: 'clubs', rank: 10 }],
        previousTop: { suit: 'diamonds', rank: 6 },
        discard: [{ suit: 'diamonds', rank: 6 }],
      })

      const next = applyDiscardAndDraw(state, [0, 1], 'deck')

      expect(next.hands[0]).toEqual([{ suit: 'clubs', rank: 10 }])
      expect(next.deck).toEqual([])
      expect(next.discard).toEqual([
        { suit: 'diamonds', rank: 6 },
        { suit: 'spades', rank: 9 },
        { suit: 'hearts', rank: 9 },
      ])
      expect(next.currentPlayer).toBe(1)
      expect(next.phase).toBe('playing')
    })

    it('can draw the discard pile card that was on top before discarding', () => {
      const previousTop: Card = { suit: 'diamonds', rank: 10 }
      const state = makeState({
        hands: [[{ suit: 'spades', rank: 9 }], []],
        deck: [{ suit: 'clubs', rank: 2 }],
        previousTop,
        discard: [previousTop],
      })

      const next = applyDiscardAndDraw(state, [0], 'discard')

      expect(next.hands[0]).toEqual([previousTop])
      expect(next.deck).toEqual([{ suit: 'clubs', rank: 2 }]) // 山札は引かれていない
      expect(next.discard).toEqual([{ suit: 'spades', rank: 9 }])
      expect(next.previousTop).toEqual({ suit: 'spades', rank: 9 })
    })

    it('wins when hand value drops to exactly the threshold (7)', () => {
      const state = makeState({
        hands: [[{ suit: 'spades', rank: 7 }, { suit: 'hearts', rank: 1 }], []],
        deck: [{ suit: 'clubs', rank: 6 }],
        previousTop: { suit: 'diamonds', rank: 9 },
        discard: [{ suit: 'diamonds', rank: 9 }],
      })

      const next = applyDiscardAndDraw(state, [0], 'deck')

      expect(handValue(next.hands[0])).toBe(7)
      expect(next.phase).toBe('finished')
      expect(next.winner).toBe(0)
      expect(next.currentPlayer).toBe(0)
    })

    it('does not win when hand value is above the threshold (8)', () => {
      const state = makeState({
        hands: [[{ suit: 'spades', rank: 7 }, { suit: 'hearts', rank: 1 }], []],
        deck: [{ suit: 'clubs', rank: 7 }],
        previousTop: { suit: 'diamonds', rank: 9 },
        discard: [{ suit: 'diamonds', rank: 9 }],
      })

      const next = applyDiscardAndDraw(state, [0], 'deck')

      expect(handValue(next.hands[0])).toBe(8)
      expect(next.phase).toBe('playing')
      expect(next.winner).toBeNull()
      expect(next.currentPlayer).toBe(1)
    })

    it('reshuffles the discard pile (except its top card) back into the deck when the deck is empty', () => {
      const cardA: Card = { suit: 'clubs', rank: 2 }
      const cardB: Card = { suit: 'hearts', rank: 3 }
      const cardC: Card = { suit: 'diamonds', rank: 4 }
      const state = makeState({
        hands: [[{ suit: 'spades', rank: 1 }, { suit: 'hearts', rank: 1 }], []],
        deck: [],
        previousTop: cardB,
        discard: [cardA, cardB, cardC],
      })

      const next = applyDiscardAndDraw(state, [0, 1], 'deck')

      // 捨て札の一番上(自分が今出したカード)以外がシャッフルされて山に戻る
      expect(next.discard).toHaveLength(1)
      expect(next.deck.length + next.hands[0].length + next.discard.length).toBe(
        state.hands[0].length + state.deck.length + state.discard.length,
      )
    })

    it('ignores moves on a finished game', () => {
      const state = makeState({ phase: 'finished', winner: 0 })
      const next = applyDiscardAndDraw(state, [0], 'deck')
      expect(next).toBe(state)
    })

    it('ignores moves that violate canDiscard', () => {
      const state = makeState({
        hands: [[{ suit: 'spades', rank: 9 }, { suit: 'hearts', rank: 3 }], []],
        deck: [{ suit: 'clubs', rank: 2 }],
      })
      const next = applyDiscardAndDraw(state, [0, 1], 'deck')
      expect(next).toBe(state)
    })
  })

  describe('ai', () => {
    const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

    it('chooseMove returns a legal discard for every difficulty', () => {
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 0; seed < 5; seed++) {
          const state = createInitialState(seed)
          const move = chooseMove(state, difficulty)
          expect(canDiscard(state.hands[state.currentPlayer], move.indices)).toBe(true)
        }
      }
    })

    it('hard never discards the joker when another group is available', () => {
      const state = makeState({
        hands: [[], [{ suit: 'joker', rank: 0 }, { suit: 'joker', rank: 0 }, { suit: 'spades', rank: 3 }]],
        currentPlayer: 1,
        previousTop: { suit: 'diamonds', rank: 3 },
        discard: [{ suit: 'diamonds', rank: 3 }],
      })

      const normalMove = chooseMove(state, 'normal')
      const hardMove = chooseMove(state, 'hard')

      // normalは「捨て札トップと同ランク(3)」を温存し、ジョーカーの組を捨てる
      expect(normalMove.indices.sort()).toEqual([0, 1])
      // hardはジョーカーを温存するため、ランク3のカードを捨てる
      expect(hardMove.indices).toEqual([2])
      expect(canDiscard(state.hands[1], hardMove.indices)).toBe(true)
    })
  })

  describe('simulation', () => {
    it('an AI vs AI game reaches a finished state with the winner at or below the threshold', () => {
      let state = createInitialState(123)
      const difficulties: [Difficulty, Difficulty] = ['normal', 'hard']
      let iterations = 0
      const MAX_ITERATIONS = 500

      while (state.phase !== 'finished' && iterations < MAX_ITERATIONS) {
        const move = chooseMove(state, difficulties[state.currentPlayer])
        expect(canDiscard(state.hands[state.currentPlayer], move.indices)).toBe(true)
        state = applyDiscardAndDraw(state, move.indices, move.source)
        iterations++
      }

      expect(state.phase).toBe('finished')
      expect(state.winner).not.toBeNull()
      expect(handValue(state.hands[state.winner as number])).toBeLessThanOrEqual(7)
      expect(iterations).toBeLessThan(MAX_ITERATIONS)
    })
  })
})
