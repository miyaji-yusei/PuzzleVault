import { chooseMove } from './ai'
import { applyDiscardAndDraw } from './rules'
import { createDeck } from './dealer'
import { Card, DrawSource, GamePhase, SevenState, Suit } from './types'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

/** 手札・捨て札に使うカードを54枚デッキから取り除き、残りを山札にした固定シーン用の状態を組み立てる */
function buildState(opts: {
  playerHand: Card[]
  aiHand: Card[]
  discard: Card[]
  /** 山札の一番上(末尾、引かれるカード)に置きたいカード */
  deckTop?: Card
  currentPlayer?: 0 | 1
  phase?: GamePhase
  winner?: 0 | 1 | null
}): SevenState {
  const remaining = createDeck()
  const removeOne = (target: Card) => {
    const index = remaining.findIndex((c) => c.suit === target.suit && c.rank === target.rank)
    if (index !== -1) remaining.splice(index, 1)
  }
  ;[...opts.playerHand, ...opts.aiHand, ...opts.discard].forEach(removeOne)
  if (opts.deckTop) {
    removeOne(opts.deckTop)
    remaining.push(opts.deckTop)
  }

  return {
    deck: remaining,
    hands: [opts.playerHand, opts.aiHand],
    discard: opts.discard,
    previousTop: opts.discard[opts.discard.length - 1] ?? null,
    currentPlayer: opts.currentPlayer ?? 0,
    phase: opts.phase ?? 'playing',
    winner: opts.winner ?? null,
    seed: 0,
  }
}

export type TutorialHighlight = { type: 'hand-rank'; rank: number } | { type: 'pile'; pile: DrawSource } | null

export type TutorialAction = { type: 'select-rank'; rank: number } | { type: 'draw'; source: DrawSource } | null

export interface TutorialStep {
  title: string
  message: string
  state: SevenState
  /** 注目させたい手札のランク、または山札/捨て札のどちらか */
  highlight: TutorialHighlight
  /** この操作を行うと次のステップへ進む。nullなら「次へ」ボタンで進む */
  action: TutorialAction
}

// ステップ1: ルール概要を説明する初期状態
const introState = buildState({
  playerHand: [card('spades', 13), card('hearts', 13), card('clubs', 9), card('diamonds', 5), card('spades', 3), card('hearts', 2), card('clubs', 1)],
  aiHand: [card('hearts', 8), card('diamonds', 7), card('clubs', 6), card('spades', 5), card('hearts', 4), card('diamonds', 3), card('clubs', 2)],
  discard: [card('diamonds', 6)],
  deckTop: card('hearts', 1),
})

// ステップ2・3: Kを2枚選んで山札から引く
const selectStep = introState
const KING_INDICES = [0, 1]
const drawDeckStep = applyDiscardAndDraw(selectStep, KING_INDICES, 'deck')

// ステップ5: AI(相手)の手番例。normal戦略で1手進める
const aiMove = chooseMove(drawDeckStep, 'normal')
const aiTurnStep = applyDiscardAndDraw(drawDeckStep, aiMove.indices, aiMove.source)

// ステップ6: 捨て札から1枚引く例（見えている捨て札トップを回収する）
const drawDiscardBefore = aiTurnStep

// ステップ7・8: 同ランク温存の考え方を説明する例
const strategyState = buildState({
  playerHand: [card('spades', 4), card('hearts', 4), card('clubs', 10), card('diamonds', 10), card('spades', 8), card('hearts', 2), card('clubs', 1)],
  aiHand: [card('diamonds', 5), card('clubs', 5), card('spades', 6), card('hearts', 7), card('diamonds', 2), card('clubs', 3), card('spades', 9)],
  discard: [card('clubs', 4)],
})

// ステップ9: 終盤の手札例（合計9 → もう少しで7以下）
const endgameState = buildState({
  playerHand: [card('spades', 4), card('hearts', 3), card('clubs', 2)],
  aiHand: [card('diamonds', 6), card('clubs', 5), card('hearts', 4), card('spades', 3)],
  discard: [card('diamonds', 1)],
})

// ステップ10: 勝利体験（合計7以下で勝利済み）
const victoryState = buildState({
  playerHand: [card('spades', 4), card('hearts', 1), card('clubs', 2)],
  aiHand: [card('diamonds', 6), card('clubs', 5), card('hearts', 4), card('spades', 3)],
  discard: [card('diamonds', 9)],
  phase: 'finished',
  winner: 0,
})

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '遊び方ガイド (1/10) ルール概要',
    message:
      'SevenはあなたとAIで7枚の手札を持って対戦するゲームです。\n\n手札の合計（ジョーカー＝0点、A〜Kは数字どおり）が7以下になったら、その時点で即勝利です。実際に手を動かして覚えていきましょう。',
    state: introState,
    highlight: null,
    action: null,
  },
  {
    title: '遊び方ガイド (2/10) カードを選ぶ',
    message: 'まずは手札の「K」を2枚タップして選んでみましょう。同じランクのカードはまとめて選択できます。',
    state: selectStep,
    highlight: { type: 'hand-rank', rank: 13 },
    action: { type: 'select-rank', rank: 13 },
  },
  {
    title: '遊び方ガイド (3/10) 山札から引く',
    message: 'Kを選んだ状態で、山札（裏向きのカード）をタップして1枚引いてみましょう。',
    state: selectStep,
    highlight: { type: 'pile', pile: 'deck' },
    action: { type: 'draw', source: 'deck' },
  },
  {
    title: '遊び方ガイド (4/10) 手札の変化',
    message: '選んだKを2枚捨てて、山札から新しいカードを1枚引きました。手札は自動的にランク順に並び替わります。',
    state: drawDeckStep,
    highlight: null,
    action: null,
  },
  {
    title: '遊び方ガイド (5/10) 相手の手番',
    message: 'あなたが引き終えると、AIの手番になります。AIも同じように「同ランクをまとめて捨てて1枚引く」を行い、捨て札の一番上が新しくなります。',
    state: aiTurnStep,
    highlight: null,
    action: null,
  },
  {
    title: '遊び方ガイド (6/10) 捨て札から引く',
    message: '次はあなたの手番です。手札を1枚捨てたあと、見えている捨て札の一番上のカードをタップして回収してみましょう。',
    state: drawDiscardBefore,
    highlight: { type: 'pile', pile: 'discard' },
    action: { type: 'draw', source: 'discard' },
  },
  {
    title: '遊び方ガイド (7/10) 戦略のコツ①',
    message: '捨て札の一番上と同じランクのカードを持っていると、相手はそのカードを回収しやすくなります。むやみに捨てず、温存するのも一つの作戦です。',
    state: strategyState,
    highlight: { type: 'hand-rank', rank: 4 },
    action: null,
  },
  {
    title: '遊び方ガイド (8/10) 戦略のコツ②',
    message: '逆に、自分の手札に合計点の高いランクが複数枚あるなら、まとめて捨てることで一気に合計点を減らせます。状況を見て使い分けましょう。',
    state: strategyState,
    highlight: { type: 'hand-rank', rank: 10 },
    action: null,
  },
  {
    title: '遊び方ガイド (9/10) 終盤の例',
    message: 'これは終盤の手札の例です。残りカードの合計はあと少しで7以下になりそうです。引くカードによって一気に勝利が見えてきます。',
    state: endgameState,
    highlight: null,
    action: null,
  },
  {
    title: '遊び方ガイド (10/10) 勝利！',
    message: '手札の合計が7以下になると、その場で勝利です！\n\nこれでSevenの基本はOKです。さっそく対戦してみましょう。',
    state: victoryState,
    highlight: null,
    action: null,
  },
]

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length
