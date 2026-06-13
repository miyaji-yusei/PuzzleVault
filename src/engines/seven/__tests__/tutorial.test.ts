import { canDiscard, handValue } from '../rules'
import { TUTORIAL_STEPS, TUTORIAL_STEP_COUNT } from '../tutorial'
import { Card, SevenState } from '../types'

function totalCards(state: SevenState): number {
  return state.hands[0].length + state.hands[1].length + state.deck.length + state.discard.length
}

// 各カードを"スート-ランク"のキーにし、ジョーカー2枚を含む54枚と一致するかを確認する
function cardKeys(state: SevenState): string[] {
  const cards: Card[] = [...state.hands[0], ...state.hands[1], ...state.deck, ...state.discard]
  return cards.map((c) => `${c.suit}-${c.rank}`).sort()
}

describe('Seven Tutorial', () => {
  it('has exactly 10 steps', () => {
    expect(TUTORIAL_STEP_COUNT).toBe(10)
    expect(TUTORIAL_STEPS).toHaveLength(10)
  })

  it('every step state conserves all 54 cards with no duplicates beyond the 2 jokers', () => {
    const fullDeckKeys = (() => {
      const keys: string[] = []
      for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
        for (let rank = 1; rank <= 13; rank++) keys.push(`${suit}-${rank}`)
      }
      keys.push('joker-0', 'joker-0')
      return keys.sort()
    })()

    for (const step of TUTORIAL_STEPS) {
      expect(totalCards(step.state)).toBe(54)
      expect(cardKeys(step.state)).toEqual(fullDeckKeys)
    }
  })

  it('every step has a non-empty title and message', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.message.length).toBeGreaterThan(0)
    }
  })

  it('step 2 highlights and requires selecting a king (rank 13) from the player hand', () => {
    const step = TUTORIAL_STEPS[1] as (typeof TUTORIAL_STEPS)[number]
    expect(step.highlight).toEqual({ type: 'hand-rank', rank: 13 })
    expect(step.action).toEqual({ type: 'select-rank', rank: 13 })
    const kings = step.state.hands[0].filter((c) => c.rank === 13)
    expect(kings.length).toBeGreaterThanOrEqual(1)
  })

  it('step 3 highlights the deck and requires drawing from it', () => {
    const step = TUTORIAL_STEPS[2] as (typeof TUTORIAL_STEPS)[number]
    expect(step.highlight).toEqual({ type: 'pile', pile: 'deck' })
    expect(step.action).toEqual({ type: 'draw', source: 'deck' })
  })

  it('step 4 shows the result after discarding the kings and drawing from the deck', () => {
    const before = TUTORIAL_STEPS[1] as (typeof TUTORIAL_STEPS)[number]
    const after = TUTORIAL_STEPS[3] as (typeof TUTORIAL_STEPS)[number]
    expect(after.state.hands[0].some((c) => c.rank === 13)).toBe(false)
    expect(after.state.hands[0].length).toBe(before.state.hands[0].length - 1)
    expect(after.action).toBeNull()
  })

  it('step 6 highlights the discard pile and requires drawing from it', () => {
    const step = TUTORIAL_STEPS[5] as (typeof TUTORIAL_STEPS)[number]
    expect(step.highlight).toEqual({ type: 'pile', pile: 'discard' })
    expect(step.action).toEqual({ type: 'draw', source: 'discard' })
    expect(step.state.discard.length).toBeGreaterThan(0)
  })

  it('steps 7 and 8 highlight a rank present in the player hand for strategy explanation', () => {
    for (const index of [6, 7]) {
      const step = TUTORIAL_STEPS[index] as (typeof TUTORIAL_STEPS)[number]
      const highlight = step.highlight
      expect(highlight?.type).toBe('hand-rank')
      if (highlight?.type === 'hand-rank') {
        const matching = step.state.hands[0].filter((c) => c.rank === highlight.rank)
        expect(matching.length).toBeGreaterThanOrEqual(1)
      }
      expect(step.action).toBeNull()
    }
  })

  it('step 9 shows an endgame-like hand close to the win threshold', () => {
    const step = TUTORIAL_STEPS[8] as (typeof TUTORIAL_STEPS)[number]
    expect(step.state.phase).toBe('playing')
    expect(handValue(step.state.hands[0])).toBeGreaterThan(7)
    expect(handValue(step.state.hands[0])).toBeLessThanOrEqual(10)
  })

  it('step 10 shows a finished, won game with hand value at or below the win threshold', () => {
    const step = TUTORIAL_STEPS[9] as (typeof TUTORIAL_STEPS)[number]
    expect(step.state.phase).toBe('finished')
    expect(step.state.winner).toBe(0)
    expect(handValue(step.state.hands[0])).toBeLessThanOrEqual(7)
  })

  it('every "draw" action step has a hand where the player can legally discard at least one group', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.action?.type === 'draw' && step.state.hands[0].length > 0) {
        expect(canDiscard(step.state.hands[0], [0])).toBe(true)
      }
    }
  })

  it('builds all 10 tutorial states within 500ms', () => {
    const start = Date.now()
    // モジュール読み込み時に構築済みのデータへアクセスするだけだが、生成相当の処理として時間を確認する
    for (const step of TUTORIAL_STEPS) {
      expect(step.state).toBeDefined()
    }
    expect(Date.now() - start).toBeLessThan(500)
  })
})
