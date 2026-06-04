import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SevenState, Card, Suit, Rank } from '../../../engines/seven/types'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

function rankStr(rank: Rank): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 }
  return [...cards].sort((a, b) => {
    const sd = suitOrder[a.suit] - suitOrder[b.suit]
    return sd !== 0 ? sd : a.rank - b.rank
  })
}

type Props = {
  state: SevenState
  selectedCard: Card | null
  playableCards: Card[]
  isHumanTurn: boolean
  onSelectCard: (card: Card) => void
}

export function SevenBoard({ state, selectedCard, playableCards, isHumanTurn, onSelectCard }: Props) {
  const humanHand = sortHand(state.hands[0] ?? [])
  const aiHands = state.hands.slice(1)

  return (
    <View style={styles.container}>
      {/* AI hands */}
      <View style={styles.aiSection}>
        {aiHands.map((hand, idx) => {
          const playerIdx = idx + 1
          const isFinished = state.finished.includes(playerIdx)
          const isCurrentTurn = state.currentPlayer === playerIdx
          return (
            <View key={idx} style={styles.aiRow}>
              <Text style={[styles.aiLabel, isCurrentTurn && styles.activeLabel]}>
                {isCurrentTurn ? '▶ ' : '   '}AI {idx + 1}
                {isFinished ? ' (上がり)' : ` ${hand.length}枚`}
              </Text>
              <View style={styles.aiCards}>
                {hand.slice(0, 6).map((_, i) => (
                  <View key={i} style={styles.cardBack} />
                ))}
                {hand.length > 6 && (
                  <Text style={styles.cardBackMore}>+{hand.length - 6}</Text>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {/* Field */}
      <View style={styles.fieldSection}>
        <Text style={styles.fieldTitle}>場</Text>
        {SUITS.map(suit => {
          const f = state.field[suit]
          const sym = SUIT_SYMBOLS[suit]
          const red = isRedSuit(suit)
          return (
            <View key={suit} style={styles.fieldRow}>
              <Text style={[styles.suitSymbol, red && styles.redSuit]}>{sym}</Text>
              {!f.started ? (
                <Text style={styles.fieldRange}>── 7 ──</Text>
              ) : (
                <Text style={styles.fieldRange}>
                  {rankStr(f.min)} ← 7 → {rankStr(f.max)}
                </Text>
              )}
            </View>
          )
        })}
      </View>

      {/* Human hand */}
      <View style={styles.handSection}>
        <Text style={[styles.handTitle, isHumanTurn && styles.activeLabel]}>
          {isHumanTurn ? '▶ あなたの手番' : 'あなたの手札'}
        </Text>
        {state.finished.includes(0) ? (
          <Text style={styles.finishedText}>上がり！</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.handScroll}>
            <View style={styles.handCards}>
              {humanHand.map((card, i) => {
                const isPlayable = playableCards.some(c => c.suit === card.suit && c.rank === card.rank)
                const isSelected = selectedCard?.suit === card.suit && selectedCard?.rank === card.rank
                const red = isRedSuit(card.suit)
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.card,
                      isSelected && styles.selectedCard,
                      !isPlayable && styles.unplayableCard,
                    ]}
                    onPress={() => onSelectCard(card)}
                    disabled={!isPlayable || !isHumanTurn}
                  >
                    <Text style={[styles.cardRank, red && styles.redText, !isPlayable && styles.dimText]}>
                      {rankStr(card.rank)}
                    </Text>
                    <Text style={[styles.cardSuit, red && styles.redText, !isPlayable && styles.dimText]}>
                      {SUIT_SYMBOLS[card.suit]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  aiSection: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  activeLabel: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  aiCards: {
    flexDirection: 'row',
    gap: 2,
    flexWrap: 'wrap',
  },
  cardBack: {
    width: 18,
    height: 26,
    backgroundColor: '#1a237e',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#0d47a1',
  },
  cardBackMore: {
    fontSize: 11,
    color: '#666',
    alignSelf: 'center',
  },
  fieldSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  fieldTitle: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 8,
  },
  suitSymbol: {
    fontSize: 16,
    width: 20,
    color: '#333',
  },
  redSuit: {
    color: '#c62828',
  },
  fieldRange: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  handSection: {
    backgroundColor: '#fff9c4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
  },
  handTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  handScroll: {
    flexGrow: 0,
  },
  handCards: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  card: {
    width: 44,
    height: 62,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#ffa000',
    borderWidth: 2.5,
    backgroundColor: '#fffde7',
    transform: [{ translateY: -4 }],
  },
  unplayableCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  cardRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 20,
  },
  cardSuit: {
    fontSize: 14,
    color: '#333',
    lineHeight: 16,
  },
  redText: {
    color: '#c62828',
  },
  dimText: {
    color: '#bdbdbd',
  },
  finishedText: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
  },
})
