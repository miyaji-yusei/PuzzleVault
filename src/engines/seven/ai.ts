import { cardValue } from './rules'
import { Card, Difficulty, DrawSource, SevenMove, SevenState } from './types'

// 手札をランク別にグルーピングし、各ランクのインデックス一覧を返す
function groupByRank(hand: Card[]): Map<number, number[]> {
  const groups = new Map<number, number[]>()
  hand.forEach((card, i) => {
    const list = groups.get(card.rank) ?? []
    list.push(i)
    groups.set(card.rank, list)
  })
  return groups
}

function groupValue(hand: Card[], indices: number[]): number {
  return indices.reduce((sum, i) => sum + cardValue(hand[i] as Card), 0)
}

// excludeRanksに含まれないランクの中で、合計点数が最大のグループを返す(全て除外対象なら null)
function highestValueGroup(hand: Card[], groups: Map<number, number[]>, excludeRanks: Set<number>): number[] | null {
  let best: number[] | null = null
  let bestValue = -1
  for (const [rank, indices] of groups) {
    if (excludeRanks.has(rank)) continue
    const value = groupValue(hand, indices)
    if (value > bestValue) {
      bestValue = value
      best = indices
    }
  }
  return best
}

// easy: 捨て札トップと同ランクのカードを優先的に捨てる。なければ最も価値の高いランクを捨てる(ジョーカーも対象)
// normal: 捨て札トップと同ランクのカードは温存し、それ以外で最も価値の高いランクを捨てる
// hard: normalと同様だが、ジョーカーも温存する(0点として最後まで保持)
function chooseDiscard(state: SevenState, difficulty: Difficulty): number[] {
  const hand = state.hands[state.currentPlayer]
  const groups = groupByRank(hand)
  const topRank = state.previousTop?.rank

  if (difficulty === 'easy') {
    if (topRank !== undefined && groups.has(topRank)) {
      return groups.get(topRank) as number[]
    }
    return highestValueGroup(hand, groups, new Set()) as number[]
  }

  const preserve = new Set<number>()
  if (topRank !== undefined) preserve.add(topRank)
  if (difficulty === 'hard') preserve.add(0) // ジョーカー(rank 0)

  return highestValueGroup(hand, groups, preserve) ?? (highestValueGroup(hand, groups, new Set()) as number[])
}

// 捨て札トップ(直前の相手の捨て札)の点数が低いほど回収する価値が高い。
// hardは最も積極的に、easyは最も慎重に回収する
function chooseDrawSource(state: SevenState, difficulty: Difficulty): DrawSource {
  const top = state.previousTop
  if (!top) return 'deck'

  const value = cardValue(top)
  const threshold = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 4 : 6
  return value <= threshold ? 'discard' : 'deck'
}

// AIが現在の手番として行う「捨てる」「引く」をまとめて決定する
export function chooseMove(state: SevenState, difficulty: Difficulty): SevenMove {
  return {
    indices: chooseDiscard(state, difficulty),
    source: chooseDrawSource(state, difficulty),
  }
}
