import React, { useRef, useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { SolitaireState, Card, Suit, SolitaireMove } from '../../../engines/solitaire/types'
import { SelectedCard } from '../../../hooks/useSolitaireGame'

const { width: SW } = Dimensions.get('window')
const PAD = 8
const GAP = 3
const NUM_COLS = 7
const CARD_W = Math.floor((SW - PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS)
const CARD_H = Math.floor(CARD_W * 1.45)
const FACE_DOWN_STEP = 10
const FACE_UP_STEP = 22
// Y where tableau starts (within the ScrollView content)
const TOP_ROW_H = 8 + CARD_H + 8

const SUIT_SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS = new Set<Suit>(['hearts', 'diamonds'])
const RANK_LABEL: Partial<Record<number, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

type DragInfo = {
  fromPile: 'tableau' | 'waste'
  colIndex: number
  cardIndex: number
  cards: Card[]
}

type Props = {
  state: SolitaireState
  selected: SelectedCard | null
  onTapStock: () => void
  onTapWaste: () => void
  onTapFoundation: (foundationIndex: number) => void
  onTapTableau: (colIndex: number, cardIndex?: number) => void
  onDoubleTapCard: (colIndex: number) => void
  onDirectMove: (move: SolitaireMove) => void
}

function CardView({ card, width, height, highlighted, dimmed }: {
  card: Card
  width: number
  height: number
  highlighted?: boolean
  dimmed?: boolean
}) {
  if (!card.faceUp) {
    return (
      <View style={[cStyles.base, { width, height }, cStyles.back, highlighted && cStyles.highlight, dimmed && cStyles.dimmed]}>
        <Text style={cStyles.backText}>★</Text>
      </View>
    )
  }
  const rank = RANK_LABEL[card.rank] ?? String(card.rank)
  const isRed = RED_SUITS.has(card.suit)
  const color = isRed ? '#c62828' : '#212121'
  return (
    <View style={[cStyles.base, { width, height }, highlighted && cStyles.highlight, dimmed && cStyles.dimmed]}>
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

export function SolitaireBoard({
  state, selected, onTapStock, onTapWaste, onTapFoundation, onTapTableau, onDoubleTapCard, onDirectMove,
}: Props) {
  const { tableau, foundation, stock, waste } = state
  const foundationLabels = ['♠', '♥', '♦', '♣']

  // Board absolute position (measured once on layout)
  const boardRef = useRef<View>(null)
  const boardTopRef = useRef(0)
  const boardLeftRef = useRef(0)
  const scrollYRef = useRef(0)

  // Drag overlay
  const overlayX = useSharedValue(0)
  const overlayY = useSharedValue(0)
  const overlayOpacity = useSharedValue(0)
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)

  const overlayStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: overlayX.value,
    top: overlayY.value,
    opacity: overlayOpacity.value,
    zIndex: 999,
  }))

  const measureBoard = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      boardTopRef.current = y
      boardLeftRef.current = x
    })
  }, [])

  const handleDrop = useCallback((absX: number, absY: number, fromCol: number, fromCardIdx: number) => {
    const relY = absY - boardTopRef.current + scrollYRef.current
    const relX = absX - boardLeftRef.current

    if (relY >= 0 && relY < TOP_ROW_H) {
      // Dropped on foundation row
      onDirectMove({
        type: 'tableau-to-foundation',
        from: { pile: 'tableau', index: fromCol, cardIndex: fromCardIdx },
      })
    } else if (relY >= TOP_ROW_H) {
      // Dropped on tableau
      const toCol = Math.round((relX - PAD) / (CARD_W + GAP))
      const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, toCol))
      if (clampedCol !== fromCol) {
        onDirectMove({
          type: 'tableau-to-tableau',
          from: { pile: 'tableau', index: fromCol, cardIndex: fromCardIdx },
          to: { pile: 'tableau', index: clampedCol },
        })
      }
    }
    setDragInfo(null)
  }, [onDirectMove])

  function makeTableauGesture(colIndex: number, cardIndex: number, card: Card) {
    if (!card.faceUp) {
      return Gesture.Tap().onEnd(() => runOnJS(onTapTableau)(colIndex))
    }

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(300)
      .onEnd(() => runOnJS(onDoubleTapCard)(colIndex))

    const singleTap = Gesture.Tap()
      .onEnd(() => runOnJS(onTapTableau)(colIndex, cardIndex))

    const col = state.tableau[colIndex] ?? []
    const cards = col.slice(cardIndex)

    const pan = Gesture.Pan()
      .minDistance(8)
      .onStart((e) => {
        overlayX.value = e.absoluteX - CARD_W / 2
        overlayY.value = e.absoluteY - CARD_H / 4
        overlayOpacity.value = withTiming(0.9, { duration: 80 })
        runOnJS(setDragInfo)({ fromPile: 'tableau', colIndex, cardIndex, cards })
      })
      .onUpdate((e) => {
        overlayX.value = e.absoluteX - CARD_W / 2
        overlayY.value = e.absoluteY - CARD_H / 4
      })
      .onEnd((e) => {
        overlayOpacity.value = withTiming(0, { duration: 120 })
        runOnJS(handleDrop)(e.absoluteX, e.absoluteY, colIndex, cardIndex)
      })
      .onFinalize(() => {
        overlayOpacity.value = withTiming(0, { duration: 80 })
        runOnJS(setDragInfo)(null)
      })

    return Gesture.Race(pan, Gesture.Exclusive(doubleTap, singleTap))
  }

  return (
    <View
      ref={boardRef}
      style={{ flex: 1 }}
      onLayout={measureBoard}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y }}
      >
        {/* Top row: foundation + stock/waste */}
        <View style={styles.topRow}>
          <View style={styles.foundationRow}>
            {foundation.map((pile, fi) => {
              const isFoundationSelected = selected?.pile === 'foundation' && selected.index === fi
              return (
                <TouchableOpacity
                  key={`f-${fi}`}
                  onPress={() => onTapFoundation(fi)}
                  style={{ marginRight: fi < 3 ? GAP : 0 }}
                  activeOpacity={0.7}
                >
                  {pile.length > 0 ? (
                    <CardView
                      card={pile[pile.length - 1]}
                      width={CARD_W}
                      height={CARD_H}
                      highlighted={isFoundationSelected}
                    />
                  ) : (
                    <EmptySlot width={CARD_W} height={CARD_H} label={foundationLabels[fi]} />
                  )}
                </TouchableOpacity>
              )
            })}
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
                  const isDragged =
                    dragInfo?.fromPile === 'tableau' &&
                    dragInfo.colIndex === ci &&
                    cardi >= dragInfo.cardIndex
                  const gesture = makeTableauGesture(ci, cardi, card)
                  return (
                    <GestureDetector key={`card-${ci}-${cardi}`} gesture={gesture}>
                      <View style={{ position: 'absolute', top: offsets[cardi] }}>
                        <CardView
                          card={card}
                          width={CARD_W}
                          height={CARD_H}
                          highlighted={inStack}
                          dimmed={isDragged}
                        />
                      </View>
                    </GestureDetector>
                  )
                })}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Drag overlay */}
      {dragInfo && (
        <Animated.View style={overlayStyle} pointerEvents="none">
          {dragInfo.cards.map((card, i) => (
            <View key={i} style={{ position: i === 0 ? 'relative' : 'absolute', top: i === 0 ? 0 : i * FACE_UP_STEP }}>
              <CardView card={card} width={CARD_W} height={CARD_H} />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
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
  dimmed: {
    opacity: 0.35,
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
