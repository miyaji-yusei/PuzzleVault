import { Card, Rank, Suit, SpiderState } from './types'

export function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}

function createDeck(suitCount: 1 | 2 | 4): Card[] {
  const allSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
  const suits = allSuits.slice(0, suitCount)
  // 104枚: suitCount=1→各ランク8枚, suitCount=2→各ランク4枚, suitCount=4→各ランク2枚
  const copiesPerSuit = 104 / (suitCount * 13)
  const cards: Card[] = []
  for (const suit of suits) {
    for (let copy = 0; copy < copiesPerSuit; copy++) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ suit, rank: rank as Rank, faceUp: false })
      }
    }
  }
  return cards
}

export function dealState(seed: number, suitCount: 1 | 2 | 4): SpiderState {
  const rng = createRng(seed)
  const deck = shuffle(createDeck(suitCount), rng)
  const tableau: Card[][] = Array.from({ length: 10 }, () => [])
  let idx = 0
  // 前4列に6枚、後6列に5枚（計54枚）、各列最後の1枚のみ表向き
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5
    for (let i = 0; i < count; i++) {
      tableau[col].push({ ...(deck[idx++] as Card), faceUp: i === count - 1 })
    }
  }
  // 残り50枚→5回分のディール（各10枚）
  const stock: Card[][] = []
  for (let deal = 0; deal < 5; deal++) {
    const dealCards: Card[] = []
    for (let col = 0; col < 10; col++) {
      dealCards.push({ ...(deck[idx++] as Card), faceUp: true })
    }
    stock.push(dealCards)
  }
  return { tableau, stock, foundation: 0, completedSuits: [], moves: 0, startedAt: 0, elapsedSeconds: 0 }
}

export function cloneState(s: SpiderState): SpiderState {
  return {
    tableau: s.tableau.map(col => col.slice()),
    stock: s.stock.map(d => d.slice()),
    foundation: s.foundation,
    completedSuits: [...s.completedSuits],
    moves: s.moves,
    startedAt: s.startedAt,
    elapsedSeconds: s.elapsedSeconds,
  }
}

export function isComplete(s: SpiderState): boolean {
  return s.foundation === 8
}

export function removeCompleteSets(s: SpiderState): void {
  let changed = true
  while (changed) {
    changed = false
    for (let col = 0; col < 10; col++) {
      const column = s.tableau[col]
      if (column.length < 13) continue
      const startIdx = column.length - 13
      const top = column[startIdx]
      if (!top || !top.faceUp || top.rank !== 13) continue
      const suit = top.suit
      let valid = true
      for (let i = 0; i < 13; i++) {
        const card = column[startIdx + i]
        if (!card || !card.faceUp || card.suit !== suit || card.rank !== (13 - i) as Rank) {
          valid = false
          break
        }
      }
      if (valid) {
        column.splice(startIdx, 13)
        s.foundation++
        s.completedSuits = [...s.completedSuits, suit]
        if (column.length > 0 && !column[column.length - 1]!.faceUp) {
          column[column.length - 1] = { ...column[column.length - 1]!, faceUp: true }
        }
        changed = true
        break
      }
    }
  }
}
