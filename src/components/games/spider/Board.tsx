import React, { useRef, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder } from 'react-native'
import { SpiderState, Card, Suit } from '../../../engines/spider/types'
import { SpiderSelection } from '../../../hooks/useSpiderGame'

const { width: SW } = Dimensions.get('window')
const PAD = 4
const GAP = 2
const NUM_COLS = 10
const CARD_W = Math.floor((SW - PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS)
const CARD_H = Math.floor(CARD_W * 1.5)
const FACE_DOWN_STEP = 6
const FACE_UP_STEP = 18
const DOUBLE_TAP_MS = 280
const DRAG_THRESHOLD = 8

const SUIT_SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS = new Set<Suit>(['hearts', 'diamonds'])
const RANK_LABEL: Partial<Record<number, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

const STOCK_H = 36
const STOCK_W = Math.round(STOCK_H / 1.5)
const STOCK_OFFSET = 4

type DragInfo = {
  col: number
  cardIndex: number
  cards: Card[]
}

function CardFace({ card, width, height, highlighted, dimmed }: {
  card: Card; width: number; height: number; highlighted?: boolean; dimmed?: boolean
}) {
  if (!card.faceUp) {
    return (
      <View style={[cs.base, { width, height }, cs.back, dimmed && cs.dimmed]} />
    )
  }
  const rank = RANK_LABEL[card.rank] ?? String(card.rank)
  const isRed = RED_SUITS.has(card.suit)
  const color = isRed ? '#c62828' : '#212121'
  return (
    <View style={[cs.base, { width, height }, highlighted && cs.highlight, dimmed && cs.dimmed]}>
      <Text style={[cs.rankText, { color }]} numberOfLines={1}>{rank}</Text>
      <Text style={[cs.suitText, { color }]} numberOfLines={1}>{SUIT_SYM[card.suit]}</Text>
    </View>
  )
}

type Props = {
  state: SpiderState
  selected: SpiderSelection | null
  onTapTableau: (col: number, cardIndex: number) => void
  onDoubleTapCard: (col: number, cardIndex: number) => void
  onDirectMove: (fromCol: number, fromCardIdx: number, toCol: number) => void
  onDeal: () => void
}

export function SpiderBoard({ state, selected, onTapTableau, onDoubleTapCard, onDirectMove, onDeal }: Props) {
  const { tableau, stock, foundation, completedSuits } = state

  // Container (full component) position for overlay absolute positioning
  const containerRef = useRef<View>(null)
  const containerLeftRef = useRef(0)
  const containerTopRef = useRef(0)

  // Status bar height measured via onLayout
  const statusBarHeightRef = useRef(0)

  // Current scroll offset
  const scrollYRef = useRef(0)

  const tableauRef = useRef(tableau)
  tableauRef.current = tableau
  const onTapTableauRef = useRef(onTapTableau)
  onTapTableauRef.current = onTapTableau
  const onDoubleTapCardRef = useRef(onDoubleTapCard)
  onDoubleTapCardRef.current = onDoubleTapCard
  const onDirectMoveRef = useRef(onDirectMove)
  onDirectMoveRef.current = onDirectMove

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

  const measureContainer = useCallback(() => {
    containerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      containerLeftRef.current = pageX
      containerTopRef.current = pageY
    })
  }, [])

  const getColAndCard = useCallback((relX: number, relY: number): { col: number; cardIndex: number } | null => {
    const col = Math.floor((relX - PAD) / (CARD_W + GAP))
    if (col < 0 || col >= NUM_COLS) return null
    const column = tableauRef.current[col]
    if (!column) return null

    if (column.length === 0) return { col, cardIndex: 0 }

    let topAcc = 0
    const offsets: number[] = []
    for (let i = 0; i < column.length; i++) {
      offsets.push(topAcc)
      if (i < column.length - 1) topAcc += column[i]!.faceUp ? FACE_UP_STEP : FACE_DOWN_STEP
    }
    const lastIdx = column.length - 1
    if (relY > offsets[lastIdx]! + CARD_H) return { col, cardIndex: lastIdx }

    for (let i = lastIdx; i >= 0; i--) {
      if (relY >= offsets[i]!) return { col, cardIndex: i }
    }
    return { col, cardIndex: 0 }
  }, [])

  const gestureState = useRef({
    isDragging: false,
    tapTimer: null as ReturnType<typeof setTimeout> | null,
    pendingTap: null as { col: number; cardIndex: number } | null,
    activeCard: null as { col: number; cardIndex: number } | null,
  })

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
    onPanResponderGrant: (e) => {
      const gs = gestureState.current
      gs.isDragging = false

      const pageX = e.nativeEvent.pageX
      const pageY = e.nativeEvent.pageY

      // relX/relY in tableau content coordinates, accounting for scroll offset
      const relX = pageX - containerLeftRef.current
      const relY = pageY - containerTopRef.current - statusBarHeightRef.current + scrollYRef.current

      gs.activeCard = getColAndCard(relX, relY)
    },
    onPanResponderMove: (e, g) => {
      const gs = gestureState.current
      if (!gs.activeCard) return
      const { col, cardIndex } = gs.activeCard
      const cardObj = tableauRef.current[col]?.[cardIndex]
      if (!cardObj?.faceUp) return

      if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) {
        if (!gs.isDragging) {
          gs.isDragging = true
          if (gs.tapTimer) { clearTimeout(gs.tapTimer); gs.tapTimer = null; gs.pendingTap = null }
          // Overlay positioned relative to container (outside ScrollView)
          overlayX.setValue(e.nativeEvent.pageX - containerLeftRef.current - CARD_W / 2)
          overlayY.setValue(e.nativeEvent.pageY - containerTopRef.current - CARD_H / 4)
          Animated.timing(overlayOpacity, { toValue: 0.9, duration: 80, useNativeDriver: false }).start()
          const column = tableauRef.current[col] ?? []
          setDragInfo({ col, cardIndex, cards: column.slice(cardIndex) })
        }
        overlayX.setValue(e.nativeEvent.pageX - containerLeftRef.current - CARD_W / 2)
        overlayY.setValue(e.nativeEvent.pageY - containerTopRef.current - CARD_H / 4)
      }
    },
    onPanResponderRelease: (e) => {
      const gs = gestureState.current
      if (gs.isDragging) {
        gs.isDragging = false
        Animated.timing(overlayOpacity, { toValue: 0, duration: 120, useNativeDriver: false }).start()
        setDragInfo(null)
        if (gs.activeCard) {
          const relX = e.nativeEvent.pageX - containerLeftRef.current
          const toCol = Math.round((relX - PAD) / (CARD_W + GAP))
          const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, toCol))
          if (clampedCol !== gs.activeCard.col) {
            onDirectMoveRef.current(gs.activeCard.col, gs.activeCard.cardIndex, clampedCol)
          }
        }
        gs.activeCard = null
        return
      }

      if (!gs.activeCard) return
      const { col, cardIndex } = gs.activeCard
      gs.activeCard = null

      const cardObj = tableauRef.current[col]?.[cardIndex]

      if (gs.pendingTap && gs.pendingTap.col === col && gs.pendingTap.cardIndex === cardIndex) {
        clearTimeout(gs.tapTimer!)
        gs.tapTimer = null
        gs.pendingTap = null
        if (cardObj?.faceUp) onDoubleTapCardRef.current(col, cardIndex)
        else onTapTableauRef.current(col, cardIndex)
      } else {
        if (gs.tapTimer) clearTimeout(gs.tapTimer)
        gs.pendingTap = { col, cardIndex }
        gs.tapTimer = setTimeout(() => {
          gs.tapTimer = null
          gs.pendingTap = null
          onTapTableauRef.current(col, cardIndex)
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
  }), [getColAndCard, overlayOpacity, overlayX, overlayY])

  const colData = tableau.map((col) => {
    const offsets: number[] = []
    let acc = 0
    for (let i = 0; i < col.length; i++) {
      offsets.push(acc)
      if (i < col.length - 1) acc += col[i]!.faceUp ? FACE_UP_STEP : FACE_DOWN_STEP
    }
    return { col, offsets, totalH: col.length === 0 ? CARD_H : acc + CARD_H }
  })

  const maxColH = Math.max(...colData.map(d => d.totalH), CARD_H)

  return (
    <View style={styles.container} ref={containerRef} onLayout={measureContainer}>
      {/* Status bar */}
      <View
        style={styles.statusRow}
        onLayout={(e) => { statusBarHeightRef.current = e.nativeEvent.layout.height }}
      >
        {/* Foundation pips with suit icons */}
        <View style={styles.foundationArea}>
          {Array.from({ length: 8 }, (_, i) => {
            const suit = completedSuits[i]
            const isCompleted = i < foundation
            return (
              <View key={i} style={[styles.foundationPip, isCompleted && styles.foundationPipFilled]}>
                {suit && (
                  <Text style={[styles.foundationSuitText, RED_SUITS.has(suit) && styles.foundationSuitRed]}>
                    {SUIT_SYM[suit]}
                  </Text>
                )}
              </View>
            )
          })}
          <Text style={styles.statusText}>  {foundation}/8</Text>
        </View>

        {/* Stock pile visual */}
        <TouchableOpacity
          onPress={onDeal}
          disabled={stock.length === 0}
          activeOpacity={0.7}
          style={[styles.stockArea, stock.length === 0 && styles.stockAreaEmpty]}
        >
          {stock.length === 0 ? (
            <View style={styles.stockEmptySlot}>
              <Text style={styles.stockEmptyText}>−</Text>
            </View>
          ) : (
            <View style={{ width: STOCK_W + (stock.length - 1) * STOCK_OFFSET, height: STOCK_H }}>
              {stock.map((_, i) => (
                <View
                  key={i}
                  style={[
                    ss.stockCard,
                    { position: 'absolute', left: i * STOCK_OFFSET, top: 0 },
                  ]}
                />
              ))}
              <View style={ss.stockBadge}>
                <Text style={ss.stockBadgeText}>{stock.length}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tableau */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        scrollEventThrottle={16}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y }}
      >
        <View
          style={[styles.tableau, { height: maxColH }]}
          {...panResponder.panHandlers}
        >
          {colData.map(({ col, offsets, totalH }, ci) => (
            <View key={ci} style={{ width: CARD_W, height: totalH }}>
              {col.length === 0 ? (
                <View style={[cs.empty, { width: CARD_W, height: CARD_H }]} />
              ) : (
                col.map((card, cardi) => {
                  const isInSelection =
                    selected !== null &&
                    selected.col === ci &&
                    cardi >= selected.cardIndex
                  const isDragged =
                    dragInfo !== null &&
                    dragInfo.col === ci &&
                    cardi >= dragInfo.cardIndex
                  return (
                    <View
                      key={cardi}
                      style={{ position: 'absolute', top: offsets[cardi] }}
                    >
                      <CardFace
                        card={card}
                        width={CARD_W}
                        height={CARD_H}
                        highlighted={isInSelection}
                        dimmed={isDragged}
                      />
                    </View>
                  )
                })
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Drag overlay - outside ScrollView, positioned relative to container */}
      {dragInfo && (
        <Animated.View style={overlayStyle} pointerEvents="none">
          {dragInfo.cards.map((card, i) => (
            <View key={i} style={{ position: i === 0 ? 'relative' : 'absolute', top: i === 0 ? 0 : i * FACE_UP_STEP }}>
              <CardFace card={card} width={CARD_W} height={CARD_H} />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  )
}

const cs = StyleSheet.create({
  base: {
    backgroundColor: '#fff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#bbb',
    overflow: 'hidden',
    paddingHorizontal: 1,
    paddingTop: 1,
  },
  back: {
    backgroundColor: '#1a237e',
  },
  rankText: {
    fontSize: Math.max(7, Math.floor(CARD_W * 0.3)),
    fontWeight: 'bold',
    lineHeight: Math.max(9, Math.floor(CARD_W * 0.35)),
  },
  suitText: {
    fontSize: Math.max(6, Math.floor(CARD_W * 0.25)),
    lineHeight: Math.max(8, Math.floor(CARD_W * 0.28)),
  },
  highlight: {
    borderColor: '#FFD700',
    borderWidth: 2,
    backgroundColor: '#fffde7',
  },
  dimmed: {
    opacity: 0.4,
  },
  empty: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
})

const ss = StyleSheet.create({
  stockCard: {
    width: STOCK_W,
    height: STOCK_H,
    backgroundColor: '#1a237e',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#3949ab',
  },
  stockBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#ffd54f',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1b5e20',
  },
  foundationArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  foundationPip: {
    width: 14,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#2e7d32',
    borderWidth: 1,
    borderColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundationPipFilled: {
    backgroundColor: '#ffd54f',
    borderColor: '#ffb300',
  },
  foundationSuitText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#212121',
  },
  foundationSuitRed: {
    color: '#c62828',
  },
  statusText: {
    color: '#c8e6c9',
    fontSize: 13,
    fontWeight: '600',
  },
  stockArea: {
    paddingVertical: 4,
  },
  stockAreaEmpty: {
    opacity: 0.4,
  },
  stockEmptySlot: {
    width: STOCK_W,
    height: STOCK_H,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockEmptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
  },
  tableau: {
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: PAD,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
})
