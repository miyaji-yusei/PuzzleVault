import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native'
import { Card, DrawSource, SevenState, Suit } from '../../../engines/seven/types'
import { vault, ink, gold, fontSize, radii } from '../../../theme'

const SUIT_SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣', joker: '★' }
const RED_SUITS = new Set<Suit>(['hearts', 'diamonds'])
const RANK_LABEL: Partial<Record<number, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

type CardSize = { width: number; height: number }

function CardFace({ card, size, dimmed }: { card: Card; size: CardSize; dimmed?: boolean }) {
  if (card.suit === 'joker') {
    return (
      <View style={[cStyles.base, size, dimmed && cStyles.dimmed]}>
        <Text style={cStyles.jokerText}>JOKER</Text>
      </View>
    )
  }
  const rank = RANK_LABEL[card.rank] ?? String(card.rank)
  const isRed = RED_SUITS.has(card.suit)
  const color = isRed ? '#c62828' : '#212121'
  return (
    <View style={[cStyles.base, size, dimmed && cStyles.dimmed]}>
      <Text style={[cStyles.corner, { color }]}>{rank}</Text>
      <Text style={[cStyles.suitCorner, { color }]}>{SUIT_SYM[card.suit]}</Text>
      <View style={cStyles.centerArea}>
        <Text style={[cStyles.suitCenter, { color }]}>{SUIT_SYM[card.suit]}</Text>
      </View>
    </View>
  )
}

function CardBack({ size, dimmed }: { size: CardSize; dimmed?: boolean }) {
  return (
    <View style={[cStyles.base, cStyles.back, size, dimmed && cStyles.dimmed]}>
      <Text style={cStyles.backText}>★</Text>
    </View>
  )
}

function EmptySlot({ size }: { size: CardSize }) {
  return <View style={[cStyles.base, cStyles.empty, size]} />
}

type Props = {
  state: SevenState
  selectedIndices: number[]
  isHumanTurn: boolean
  onSelectCard: (index: number) => void
  onDrawFrom: (source: DrawSource) => void
  /** チュートリアル用: 注目させたい手札のインデックスを金枠で強調する */
  highlightIndices?: number[]
  /** チュートリアル用: 注目させたい山札/捨て札を金枠で強調する */
  highlightPile?: DrawSource | null
  /** チュートリアル用: 手札を選択していなくても山札/捨て札をタップ可能にする */
  forceCanDraw?: boolean
}

export function SevenBoard({
  state,
  selectedIndices,
  isHumanTurn,
  onSelectCard,
  onDrawFrom,
  highlightIndices = [],
  highlightPile = null,
  forceCanDraw = false,
}: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const portraitWidth = Math.min(windowWidth, windowHeight)
  const cardWidth = Math.min(56, Math.floor((portraitWidth - 32) / 7))
  const size: CardSize = { width: cardWidth, height: Math.floor(cardWidth * 1.4) }

  const opponentHand = state.hands[1]
  const discardTop = state.discard[state.discard.length - 1] ?? null
  const canDraw = (isHumanTurn && selectedIndices.length > 0) || forceCanDraw

  const sortedHand = state.hands[0]
    .map((card, index) => ({ card, index }))
    .sort((a, b) => a.card.rank - b.card.rank)

  return (
    <View style={styles.container}>
      <View style={styles.opponentSection}>
        <Text style={styles.sectionLabel}>相手の手札（{opponentHand.length}枚）</Text>
        <View style={styles.opponentCards}>
          {opponentHand.map((_, i) => (
            <CardBack key={i} size={{ width: size.width * 0.7, height: size.height * 0.7 }} />
          ))}
        </View>
      </View>

      <View style={styles.middleRow}>
        <TouchableOpacity
          style={[styles.pile, highlightPile === 'deck' && styles.pileHighlight]}
          onPress={() => onDrawFrom('deck')}
          disabled={!canDraw}
          activeOpacity={0.7}
        >
          <View>
            <CardBack size={size} dimmed={!canDraw} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{state.deck.length}</Text>
            </View>
          </View>
          <Text style={styles.pileLabel}>山札から引く</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pile, highlightPile === 'discard' && styles.pileHighlight]}
          onPress={() => onDrawFrom('discard')}
          disabled={!canDraw}
          activeOpacity={0.7}
        >
          {discardTop ? <CardFace card={discardTop} size={size} dimmed={!canDraw} /> : <EmptySlot size={size} />}
          <Text style={styles.pileLabel}>捨て札から引く</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.handSection}>
        <Text style={styles.sectionLabel}>
          {isHumanTurn ? 'あなたの手札（同じランクをタップして選択）' : 'あなたの手札'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
          {sortedHand.map(({ card, index }) => {
            const isSelected = selectedIndices.includes(index)
            const isHighlighted = highlightIndices.includes(index)
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onSelectCard(index)}
                disabled={!isHumanTurn}
                style={[styles.handCard, isSelected && styles.selectedCard, isHighlighted && styles.highlightCard]}
                activeOpacity={0.7}
              >
                <CardFace card={card} size={size} />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  opponentSection: {
    padding: 12,
  },
  opponentCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 32,
    paddingVertical: 12,
  },
  pile: {
    alignItems: 'center',
    gap: 6,
  },
  pileHighlight: {
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: gold.accent,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: radii.full,
    backgroundColor: gold.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: ink.onGold,
  },
  pileLabel: {
    fontSize: fontSize.xs,
    color: ink.muted,
  },
  handSection: {
    padding: 12,
  },
  handRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  handCard: {
    marginTop: 12,
  },
  selectedCard: {
    marginTop: 0,
  },
  highlightCard: {
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: gold.accent,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: ink.muted,
  },
})

const cStyles = StyleSheet.create({
  base: {
    backgroundColor: '#fff',
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    backgroundColor: vault.card,
    borderColor: gold.deep,
  },
  empty: {
    backgroundColor: 'transparent',
    borderColor: vault.borderLight,
    borderStyle: 'dashed',
  },
  dimmed: {
    opacity: 0.4,
  },
  backText: {
    fontSize: 18,
    color: gold.accent,
  },
  corner: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  suitCorner: {
    position: 'absolute',
    top: 18,
    left: 5,
    fontSize: fontSize.xs,
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  suitCenter: {
    fontSize: 20,
  },
  jokerText: {
    fontSize: fontSize.xs,
    fontWeight: 'bold',
    color: gold.deep,
    transform: [{ rotate: '-30deg' }],
  },
})
