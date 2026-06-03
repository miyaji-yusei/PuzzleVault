import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native'
import { SolitaireState, Card, Suit } from '../../../engines/solitaire/types'
import { SelectedCard } from '../../../hooks/useSolitaireGame'

const { width: SW } = Dimensions.get('window')
const PAD = 8
const GAP = 3
const NUM_COLS = 7
const CARD_W = Math.floor((SW - PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS)
const CARD_H = Math.floor(CARD_W * 1.45)
const FACE_DOWN_STEP = 10
const FACE_UP_STEP = 22

const SUIT_SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS = new Set<Suit>(['hearts', 'diamonds'])
const RANK_LABEL: Partial<Record<number, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

type Props = {
  state: SolitaireState
  selected: SelectedCard | null
  onTapStock: () => void
  onTapWaste: () => void
  onTapFoundation: () => void
  onTapTableau: (colIndex: number, cardIndex?: number) => void
}

function CardView({ card, width, height, highlighted }: { card: Card; width: number; height: number; highlighted?: boolean }) {
  if (!card.faceUp) {
    return (
      <View style={[cStyles.base, { width, height }, cStyles.back, highlighted && cStyles.highlight]}>
        <Text style={cStyles.backText}>★</Text>
      </View>
    )
  }
  const rank = RANK_LABEL[card.rank] ?? String(card.rank)
  const isRed = RED_SUITS.has(card.suit)
  const color = isRed ? '#c62828' : '#212121'
  return (
    <View style={[cStyles.base, { width, height }, highlighted && cStyles.highlight]}>
      <Text style={[cStyles.corner, { color }]}>{rank}</Text>
      <Text style={[cStyles.suitCorner, { color }]}>{SUIT_SYM[card.suit]}</Text>
      <View style={cStyles.centerArea}>
        <Text style={[cStyles.suitCenter, { color }]}>{SUIT_SYM[card.suit]}</Text>
      </View>
    </View>
  )
}

function EmptySlot({ width, height, label, onPress }: { width: number; height: number; label?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[cStyles.empty, { width, height }]}
    >
      {label ? <Text style={cStyles.emptyLabel}>{label}</Text> : null}
    </TouchableOpacity>
  )
}

export function SolitaireBoard({ state, selected, onTapStock, onTapWaste, onTapFoundation, onTapTableau }: Props) {
  const { tableau, foundation, stock, waste } = state
  const foundationLabels = ['♠', '♥', '♦', '♣']

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top row: foundation + stock/waste */}
      <View style={styles.topRow}>
        <View style={styles.foundationRow}>
          {foundation.map((pile, fi) => (
            <TouchableOpacity key={`f-${fi}`} onPress={onTapFoundation} style={{ marginRight: fi < 3 ? GAP : 0 }}>
              {pile.length > 0 ? (
                <CardView card={pile[pile.length - 1]} width={CARD_W} height={CARD_H} />
              ) : (
                <EmptySlot width={CARD_W} height={CARD_H} label={foundationLabels[fi]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.stockRow}>
          <TouchableOpacity onPress={onTapStock} style={{ marginRight: GAP }}>
            {stock.length > 0 ? (
              <View style={[cStyles.base, { width: CARD_W, height: CARD_H }, cStyles.back]}>
                <Text style={[cStyles.backText, { fontSize: 11 }]}>{stock.length}</Text>
              </View>
            ) : (
              <EmptySlot width={CARD_W} height={CARD_H} label="↺" onPress={onTapStock} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onTapWaste}>
            {waste.length > 0 ? (
              <CardView
                card={waste[waste.length - 1]}
                width={CARD_W}
                height={CARD_H}
                highlighted={selected?.pile === 'waste'}
              />
            ) : (
              <EmptySlot width={CARD_W} height={CARD_H} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tableau */}
      <View style={styles.tableau}>
        {tableau.map((col, ci) => {
          if (col.length === 0) {
            return (
              <EmptySlot
                key={`col-${ci}`}
                width={CARD_W}
                height={CARD_H}
                onPress={() => onTapTableau(ci)}
              />
            )
          }

          const offsets: number[] = []
          let topAcc = 0
          for (let i = 0; i < col.length; i++) {
            offsets.push(topAcc)
            if (i < col.length - 1) topAcc += col[i].faceUp ? FACE_UP_STEP : FACE_DOWN_STEP
          }
          const colHeight = topAcc + CARD_H

          return (
            <View key={`col-${ci}`} style={{ width: CARD_W, height: colHeight, position: 'relative' }}>
              {col.map((card, cardi) => {
                const inStack =
                  selected?.pile === 'tableau' &&
                  selected.colIndex === ci &&
                  cardi >= selected.cardIndex
                return (
                  <TouchableOpacity
                    key={`card-${ci}-${cardi}`}
                    style={{ position: 'absolute', top: offsets[cardi] }}
                    onPress={() => card.faceUp ? onTapTableau(ci, cardi) : onTapTableau(ci)}
                    activeOpacity={0.8}
                  >
                    <CardView
                      card={card}
                      width={CARD_W}
                      height={CARD_H}
                      highlighted={inStack}
                    />
                  </TouchableOpacity>
                )
              })}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const cStyles = StyleSheet.create({
  base: {
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bbb',
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingTop: 1,
  },
  back: {
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#90caf9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  corner: {
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 13,
  },
  suitCorner: {
    fontSize: 10,
    lineHeight: 11,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suitCenter: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  empty: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 'bold',
  },
  highlight: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
})

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: PAD,
    paddingVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  foundationRow: {
    flexDirection: 'row',
  },
  stockRow: {
    flexDirection: 'row',
  },
  tableau: {
    flexDirection: 'row',
    gap: GAP,
    alignItems: 'flex-start',
  },
})
