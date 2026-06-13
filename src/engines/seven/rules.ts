import { Card, DrawSource, SevenState, WIN_THRESHOLD } from './types'

// カードの点数。ジョーカーは0、それ以外はランクそのもの(A=1〜K=13)
export function cardValue(card: Card): number {
  return card.suit === 'joker' ? 0 : card.rank
}

// 手札の合計点数(ジョーカー=0として計算)
export function handValue(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + cardValue(card), 0)
}

// indicesで指定したカードが1枚以上かつ全て同じランクであれば捨てられる
export function canDiscard(hand: Card[], indices: number[]): boolean {
  if (indices.length === 0) return false
  if (new Set(indices).size !== indices.length) return false

  let rank: number | null = null
  for (const i of indices) {
    const card = hand[i]
    if (!card) return false
    if (rank === null) {
      rank = card.rank
    } else if (card.rank !== rank) {
      return false
    }
  }
  return true
}

// 山札が尽きた場合、捨て札(トップ以外)を新しい山札に戻す
function refillDeck(deck: Card[], discard: Card[]): { deck: Card[]; discard: Card[] } {
  if (deck.length > 0 || discard.length <= 1) return { deck, discard }
  const top = discard[discard.length - 1]
  const rest = discard.slice(0, -1).reverse()
  return { deck: rest, discard: [top] }
}

// 手札からindicesのカードを捨て、sourceから1枚引いた結果の状態を返す。
// 引いた後の手札合計がWIN_THRESHOLD以下なら手番プレイヤーの勝利で終局する
export function applyDiscardAndDraw(state: SevenState, indices: number[], source: DrawSource): SevenState {
  if (state.phase !== 'playing') return state

  const player = state.currentPlayer
  const hand = state.hands[player]
  if (!canDiscard(hand, indices)) return state

  const newHand = [...hand]
  const discardedCards: Card[] = []
  for (const i of [...indices].sort((a, b) => b - a)) {
    discardedCards.unshift(newHand.splice(i, 1)[0] as Card)
  }

  const previousTop = state.previousTop
  let discard = [...state.discard, ...discardedCards]
  let deck = state.deck

  let drawnCard: Card | null = null
  if (source === 'discard' && previousTop) {
    const idx = discard.indexOf(previousTop)
    if (idx !== -1) {
      discard = [...discard.slice(0, idx), ...discard.slice(idx + 1)]
      drawnCard = previousTop
    }
  }

  if (!drawnCard) {
    const refilled = refillDeck(deck, discard)
    deck = refilled.deck
    discard = refilled.discard
    drawnCard = deck[deck.length - 1] as Card
    deck = deck.slice(0, -1)
  }

  newHand.push(drawnCard)

  const hands: [Card[], Card[]] = player === 0 ? [newHand, state.hands[1]] : [state.hands[0], newHand]
  const won = handValue(newHand) <= WIN_THRESHOLD
  const nextPlayer = (1 - player) as 0 | 1

  return {
    ...state,
    deck,
    hands,
    discard,
    previousTop: won ? state.previousTop : discard[discard.length - 1] ?? null,
    currentPlayer: won ? player : nextPlayer,
    phase: won ? 'finished' : 'playing',
    winner: won ? player : null,
  }
}
