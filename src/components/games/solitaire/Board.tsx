import React, { useRef, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native'
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
const TOP_ROW_H = 8 + CARD_H + 8
const DOUBLE_TAP_MS = 280
const DRAG_THRESHOLD = 8

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
  onDoubleTapWaste: () => void
  onTapFoundation: (foundationIndex: number) => void
  onTapTableau: (colIndex: number, cardIndex?: number) => void
  onDoubleTapCard: (colIndex: number, cardIndex: number) => void
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

function EmptySlot({ width, height, label }: { width: number; height: number; label?: string }) {
  return (
    <View style={[cStyles.empty, { width, height }]}>
      {label ? <Text style={cStyles.emptyLabel}>{label}</Text> : null}
    </View>
  )
}

export function SolitaireBoard({
  state, selected, onTapStock, onTapWaste, onDoubleTapWaste, onTapFoundation, onTapTableau, onDoubleTapCard, onDirectMove,
}: Props) {
  const { tableau, foundation, stock, waste } = state
  const foundationLabels = ['♠', '♥', '♦', '♣']

  const boardRef = useRef<View>(null)
  const boardTopRef = useRef(0)
  const boardLeftRef = useRef(0)

  const measureBoard = useCallback(() => {
    boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      boardLeftRef.current = pageX
      boardTopRef.current = pageY
    })
  }, [])

  const overlayX = useRef(new Animated.Value(0)).current
  const overlayY = useRef(new Animated.Value(0)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null)

  const overlayStyle = {
    position: 'absolute' as const,
    left: overlayX,
    top: overlayY,
    opacity: overlayOpacity,
    zIndex: 999,
  }

  const onTapTableauRef = useRef(onTapTableau)
  onTapTableauRef.current = onTapTableau
  const onDoubleTapCardRef = useRef(onDoubleTapCard)
  onDoubleTapCardRef.current = onDoubleTapCard
  const onDirectMoveRef = useRef(onDirectMove)
  onDirectMoveRef.current = onDirectMove
  const tableauRef = useRef(tableau)
  tableauRef.current = tableau
  const onTapWasteRef = useRef(onTapWaste)
  onTapWasteRef.current = onTapWaste
  const onDoubleTapWasteRef = useRef(onDoubleTapWaste)
  onDoubleTapWasteRef.current = onDoubleTapWaste
  const wasteRef = useRef(waste)
  wasteRef.current = waste
  const wasteGestureState = useRef({ isDragging: false })

  const getCardAt = useCallback((relX: number, relY: number) => {
    const col = Math.floor((relX - PAD) / (CARD_W + GAP))
    if (col < 0 || col >= NUM_COLS) return null
    // Accept any X that falls within the column's allocated space (card + gap)
    // Math.floor already assigns gap pixels to the left column, so no further check needed
    const column = tableauRef.current[col] ?? []
    if (column.length === 0) {
      return relY < CARD_H * 2 ? { col, card: -1 } : null
    }

    let topAcc = 0
    const offsets: number[] = []
    for (let i = 0; i < column.length; i++) {
      offsets.push(topAcc)
      if (i < column.length - 1) topAcc += column[i].faceUp ? FACE_UP_STEP : FACE_DOWN_STEP
    }

    const lastIdx = column.length - 1
    // Allow dragging from empty space below the last card — treat as the last card
    if (relY >= offsets[lastIdx] + CARD_H) return { col, card: lastIdx }

    let cardIdx = 0
    for (let i = lastIdx; i >= 0; i--) {
      if (relY >= offsets[i]) { cardIdx = i; break }
    }
    return { col, card: cardIdx }
  }, [])

  const handleDrop = useCallback((absX: number, absY: number, fromCol: number, fromCardIdx: number) => {
    const relY = absY - boardTopRef.current
    const relX = absX - boardLeftRef.current

    if (relY >= 0 && relY < TOP_ROW_H) {
      onDirectMoveRef.current({
        type: 'tableau-to-foundation',
        from: { pile: 'tableau', index: fromCol, cardIndex: fromCardIdx },
      })
    } else if (relY >= TOP_ROW_H) {
      const toCol = Math.round((relX - PAD) / (CARD_W + GAP))
      const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, toCol))
      if (clampedCol !== fromCol) {
        onDirectMoveRef.current({
          type: 'tableau-to-tableau',
          from: { pile: 'tableau', index: fromCol, cardIndex: fromCardIdx },
          to: { pile: 'tableau', index: clampedCol },
        })
      }
    }
    setDragInfo(null)
  }, [])

  const wastePanResponder = useMemo(() => {
    let wasteTapTimer: ReturnType<typeof setTimeout> | null = null
    let wastePendingTap = false

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) && wasteRef.current.length > 0,
      onPanResponderGrant: () => {
        wasteGestureState.current.isDragging = false
      },
      onPanResponderMove: (e, g) => {
        if (wasteRef.current.length === 0) return
        if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) {
          if (!wasteGestureState.current.isDragging) {
            wasteGestureState.current.isDragging = true
            if (wasteTapTimer) { clearTimeout(wasteTapTimer); wasteTapTimer = null; wastePendingTap = false }
            const card = wasteRef.current[wasteRef.current.length - 1]
            overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - CARD_W / 2)
            overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - CARD_H / 4)
            Animated.timing(overlayOpacity, { toValue: 0.9, duration: 80, useNativeDriver: false }).start()
            setDragInfo({ fromPile: 'waste', colIndex: -1, cardIndex: 0, cards: [card] })
          }
          overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - CARD_W / 2)
          overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - CARD_H / 4)
        }
      },
      onPanResponderRelease: (e) => {
        if (wasteGestureState.current.isDragging) {
          wasteGestureState.current.isDragging = false
          Animated.timing(overlayOpacity, { toValue: 0, duration: 120, useNativeDriver: false }).start()
          setDragInfo(null)
          const relY = e.nativeEvent.pageY - boardTopRef.current
          const relX = e.nativeEvent.pageX - boardLeftRef.current
          if (relY >= 0 && relY < TOP_ROW_H) {
            onDirectMoveRef.current({ type: 'waste-to-foundation' })
          } else if (relY >= TOP_ROW_H) {
            const toCol = Math.round((relX - PAD) / (CARD_W + GAP))
            const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, toCol))
            onDirectMoveRef.current({ type: 'waste-to-tableau', to: { pile: 'tableau', index: clampedCol } })
          }
        } else {
          if (wastePendingTap && wasteTapTimer) {
            clearTimeout(wasteTapTimer)
            wasteTapTimer = null
            wastePendingTap = false
            onDoubleTapWasteRef.current()
          } else {
            wastePendingTap = true
            // Call immediately so highlight appears without delay
            onTapWasteRef.current()
            // Timer only clears pendingTap state after double-tap window
            wasteTapTimer = setTimeout(() => {
              wasteTapTimer = null
              wastePendingTap = false
            }, DOUBLE_TAP_MS)
          }
        }
      },
      onPanResponderTerminate: () => {
        wasteGestureState.current.isDragging = false
        if (wasteTapTimer) { clearTimeout(wasteTapTimer); wasteTapTimer = null; wastePendingTap = false }
        Animated.timing(overlayOpacity, { toValue: 0, duration: 80, useNativeDriver: false }).start()
        setDragInfo(null)
      },
    })
  }, [overlayOpacity, overlayX, overlayY])

  const gestureState = useRef({
    isDragging: false,
    tapTimer: null as ReturnType<typeof setTimeout> | null,
    pendingTap: null as { col: number; card: number } | null,
    activeCard: null as { col: number; card: number } | null,
  })

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
    onPanResponderGrant: (e) => {
      const gs = gestureState.current
      gs.isDragging = false
      const relX = e.nativeEvent.pageX - boardLeftRef.current
      const relY = e.nativeEvent.pageY - boardTopRef.current - TOP_ROW_H
      gs.activeCard = relY >= 0 ? getCardAt(relX, relY) : null
    },
    onPanResponderMove: (e, g) => {
      const gs = gestureState.current
      if (!gs.activeCard || gs.activeCard.card < 0) return
      const { col, card } = gs.activeCard
      const cardObj = tableauRef.current[col]?.[card]
      if (!cardObj?.faceUp) return

      if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) {
        if (!gs.isDragging) {
          gs.isDragging = true
          if (gs.tapTimer) { clearTimeout(gs.tapTimer); gs.tapTimer = null; gs.pendingTap = null }
          // Position overlay relative to board (position: absolute within board view)
          overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - CARD_W / 2)
          overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - CARD_H / 4)
          Animated.timing(overlayOpacity, { toValue: 0.9, duration: 80, useNativeDriver: false }).start()
          const column = tableauRef.current[col] ?? []
          setDragInfo({ fromPile: 'tableau', colIndex: col, cardIndex: card, cards: column.slice(card) })
        }
        overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - CARD_W / 2)
        overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - CARD_H / 4)
      }
    },
    onPanResponderRelease: (e) => {
      const gs = gestureState.current
      if (gs.isDragging) {
        gs.isDragging = false
        Animated.timing(overlayOpacity, { toValue: 0, duration: 120, useNativeDriver: false }).start()
        setDragInfo(null)
        if (gs.activeCard && gs.activeCard.card >= 0) {
          handleDrop(e.nativeEvent.pageX, e.nativeEvent.pageY, gs.activeCard.col, gs.activeCard.card)
        }
        gs.activeCard = null
        return
      }

      if (!gs.activeCard) return
      const { col, card } = gs.activeCard
      gs.activeCard = null

      if (card < 0) {
        onTapTableauRef.current(col)
        return
      }

      if (gs.pendingTap && gs.pendingTap.col === col && gs.pendingTap.card === card) {
        clearTimeout(gs.tapTimer!)
        gs.tapTimer = null
        gs.pendingTap = null
        const cardObj = tableauRef.current[col]?.[card]
        if (cardObj?.faceUp) onDoubleTapCardRef.current(col, card)
        else onTapTableauRef.current(col, card)
      } else {
        if (gs.tapTimer) clearTimeout(gs.tapTimer)
        gs.pendingTap = { col, card }
        // Call immediately so highlight appears without delay
        onTapTableauRef.current(col, card)
        // Timer only clears pendingTap state after double-tap window
        gs.tapTimer = setTimeout(() => {
          gs.tapTimer = null
          gs.pendingTap = null
        }, DOUBLE_TAP_MS)
      }
    },
    onPanResponderTerminate: () => {
      const gs = gestureState.current
      gs.isDragging = false
      gs.activeCard = null
      if (gs.tapTimer) { clearTimeout(gs.tapTimer); gs.tapTimer = null; gs.pendingTap = null }
      Animated.timing(overlayOpacity, { toValue: 0, duration: 80, useNativeDriver: false }).start()
      setDragInfo(null)
    },
  }), [getCardAt, handleDrop, overlayOpacity, overlayX, overlayY])

  return (
    <View style={{ flex: 1 }} ref={boardRef} onLayout={measureBoard}>
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
                  <CardView card={pile[pile.length - 1]} width={CARD_W} height={CARD_H} highlighted={isFoundationSelected} />
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
              <TouchableOpacity onPress={onTapStock}>
                <EmptySlot width={CARD_W} height={CARD_H} label="↺" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          <View {...wastePanResponder.panHandlers}>
            {waste.length > 0 ? (
              <CardView
                card={waste[waste.length - 1]}
                width={CARD_W}
                height={CARD_H}
                highlighted={selected?.pile === 'waste'}
                dimmed={dragInfo?.fromPile === 'waste'}
              />
            ) : (
              <EmptySlot width={CARD_W} height={CARD_H} />
            )}
          </View>
        </View>
      </View>

      {/* Tableau */}
      <View style={styles.tableau} {...panResponder.panHandlers}>
        {tableau.map((col, ci) => {
          if (col.length === 0) {
            return <EmptySlot key={`col-${ci}`} width={CARD_W} height={CARD_H} />
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
                return (
                  <View key={`card-${ci}-${cardi}`} style={{ position: 'absolute', top: offsets[cardi] }}>
                    <CardView card={card} width={CARD_W} height={CARD_H} highlighted={inStack} dimmed={isDragged} />
                  </View>
                )
              })}
            </View>
          )
        })}
      </View>

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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: PAD,
    paddingVertical: 8,
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
    paddingHorizontal: PAD,
    paddingBottom: 8,
    flex: 1,
  },
})
