import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, useWindowDimensions } from 'react-native'
import { SolitaireState, Card, Suit, SolitaireMove } from '../../../engines/solitaire/types'
import { SelectedCard, AutoCompleteAnim } from '../../../hooks/useSolitaireGame'
import { adsEnabled, AD_BANNER_HEIGHT_ESTIMATE } from '../../../config/ads'
import { vault, gold } from '../../../theme'
import { measurePageOrigin, boardTouchFixStyle } from '../../../utils/boardCoords'
import { capGameWidth } from '../../../utils/layout'

const AUTO_COMPLETE_ANIM_MS = 220

const PAD = 8
const GAP = 3
const NUM_COLS = 7
const FACE_DOWN_STEP = 10
const FACE_UP_STEP = 22
const WASTE_FAN_STEP = 12
const DOUBLE_TAP_MS = 280
const DRAG_THRESHOLD = 8

const SUIT_SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS = new Set<Suit>(['hearts', 'diamonds'])
const RANK_LABEL: Partial<Record<number, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

type DragInfo = {
  fromPile: 'tableau' | 'waste' | 'foundation'
  colIndex: number
  cardIndex: number
  cards: Card[]
}

type Props = {
  state: SolitaireState
  selected: SelectedCard | null
  drawMode: 1 | 3
  onTapStock: () => void
  onTapWaste: () => void
  onDoubleTapWaste: () => void
  onTapFoundation: (foundationIndex: number) => void
  onTapTableau: (colIndex: number, cardIndex?: number) => void
  onDoubleTapCard: (colIndex: number, cardIndex: number) => void
  onDirectMove: (move: SolitaireMove) => void
  autoCompleteAnim?: AutoCompleteAnim | null
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
  state, selected, drawMode, onTapStock, onTapWaste, onDoubleTapWaste, onTapFoundation, onTapTableau, onDoubleTapCard, onDirectMove,
  autoCompleteAnim,
}: Props) {
  const { tableau, foundation, stock, waste } = state
  const foundationLabels = ['♠', '♥', '♦', '♣']

  // Use the shorter window dimension as the basis for card sizing so cards stay a
  // consistent, sensible size whether the device is in portrait or landscape.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  // 広告バナー表示時はバナー分の高さを利用可能領域から控除し、場札がバナーと重ならないようにする
  const availableHeight = adsEnabled ? windowHeight - AD_BANNER_HEIGHT_ESTIMATE : windowHeight
  const portraitWidth = Math.min(capGameWidth(windowWidth), availableHeight)
  const CARD_W = Math.floor((portraitWidth - PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS)
  const CARD_H = Math.floor(CARD_W * 1.45)
  const TOP_ROW_H = 8 + CARD_H + 8

  // Refs so PanResponder callbacks always read the latest dimensions without
  // needing to be recreated on every orientation change.
  const cardWRef = useRef(CARD_W)
  cardWRef.current = CARD_W
  const cardHRef = useRef(CARD_H)
  cardHRef.current = CARD_H
  const topRowHRef = useRef(TOP_ROW_H)
  topRowHRef.current = TOP_ROW_H

  const boardRef = useRef<View>(null)
  const boardTopRef = useRef(0)
  const boardLeftRef = useRef(0)

  const measureBoard = useCallback(() => {
    measurePageOrigin(boardRef.current, (origin) => {
      boardLeftRef.current = origin.x
      boardTopRef.current = origin.y
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

  // 自動完成中、組札へ飛んでいくカードのアニメーション
  const flyX = useRef(new Animated.Value(0)).current
  const flyY = useRef(new Animated.Value(0)).current
  const [flyingCard, setFlyingCard] = useState<Card | null>(null)
  const foundationViewRefs = useRef<(View | null)[]>([])
  const wasteViewRef = useRef<View>(null)
  const tableauColRefs = useRef<(View | null)[]>([])

  useEffect(() => {
    if (!autoCompleteAnim) return
    const { card, from, to } = autoCompleteAnim
    const fromView = from.pile === 'waste' ? wasteViewRef.current : tableauColRefs.current[from.col]
    const toView = foundationViewRefs.current[to.index]
    if (!fromView || !toView) return

    fromView.measure((_x1, _y1, _w1, _h1, fromPageX, fromPageY) => {
      toView.measure((_x2, _y2, _w2, _h2, toPageX, toPageY) => {
        flyX.setValue(fromPageX - boardLeftRef.current)
        flyY.setValue(fromPageY - boardTopRef.current)
        setFlyingCard(card)
        Animated.parallel([
          Animated.timing(flyX, { toValue: toPageX - boardLeftRef.current, duration: AUTO_COMPLETE_ANIM_MS, useNativeDriver: false }),
          Animated.timing(flyY, { toValue: toPageY - boardTopRef.current, duration: AUTO_COMPLETE_ANIM_MS, useNativeDriver: false }),
        ]).start(() => setFlyingCard(null))
      })
    })
  }, [autoCompleteAnim, flyX, flyY])

  const flyStyle = {
    position: 'absolute' as const,
    left: flyX,
    top: flyY,
    zIndex: 1000,
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
  const onTapFoundationRef = useRef(onTapFoundation)
  onTapFoundationRef.current = onTapFoundation
  const foundationRef = useRef(foundation)
  foundationRef.current = foundation

  const getCardAt = useCallback((relX: number, relY: number) => {
    const cardW = cardWRef.current
    const cardH = cardHRef.current
    const col = Math.floor((relX - PAD) / (cardW + GAP))
    if (col < 0 || col >= NUM_COLS) return null
    // Accept any X that falls within the column's allocated space (card + gap)
    // Math.floor already assigns gap pixels to the left column, so no further check needed
    const column = tableauRef.current[col] ?? []
    if (column.length === 0) {
      return relY < cardH * 2 ? { col, card: -1 } : null
    }

    let topAcc = 0
    const offsets: number[] = []
    for (let i = 0; i < column.length; i++) {
      offsets.push(topAcc)
      if (i < column.length - 1) topAcc += column[i].faceUp ? FACE_UP_STEP : FACE_DOWN_STEP
    }

    const lastIdx = column.length - 1
    // Allow dragging from empty space below the last card — treat as the last card
    if (relY >= offsets[lastIdx] + cardH) return { col, card: lastIdx }

    let cardIdx = 0
    for (let i = lastIdx; i >= 0; i--) {
      if (relY >= offsets[i]) { cardIdx = i; break }
    }
    return { col, card: cardIdx }
  }, [])

  const handleDrop = useCallback((absX: number, absY: number, fromCol: number, fromCardIdx: number) => {
    const relY = absY - boardTopRef.current
    const relX = absX - boardLeftRef.current
    const cardW = cardWRef.current
    const topRowH = topRowHRef.current

    if (relY >= 0 && relY < topRowH) {
      onDirectMoveRef.current({
        type: 'tableau-to-foundation',
        from: { pile: 'tableau', index: fromCol, cardIndex: fromCardIdx },
      })
    } else if (relY >= topRowH) {
      const toCol = Math.round((relX - PAD) / (cardW + GAP))
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
        // スクロール/リサイズ後でも原点が最新になるよう都度測定（webでは同期）
        measureBoard()
        wasteGestureState.current.isDragging = false
      },
      onPanResponderMove: (e, g) => {
        if (wasteRef.current.length === 0) return
        if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) {
          if (!wasteGestureState.current.isDragging) {
            wasteGestureState.current.isDragging = true
            if (wasteTapTimer) { clearTimeout(wasteTapTimer); wasteTapTimer = null; wastePendingTap = false }
            const card = wasteRef.current[wasteRef.current.length - 1]
            overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - cardWRef.current / 2)
            overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - cardHRef.current / 4)
            Animated.timing(overlayOpacity, { toValue: 0.9, duration: 80, useNativeDriver: false }).start()
            setDragInfo({ fromPile: 'waste', colIndex: -1, cardIndex: 0, cards: [card] })
          }
          overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - cardWRef.current / 2)
          overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - cardHRef.current / 4)
        }
      },
      onPanResponderRelease: (e) => {
        if (wasteGestureState.current.isDragging) {
          wasteGestureState.current.isDragging = false
          Animated.timing(overlayOpacity, { toValue: 0, duration: 120, useNativeDriver: false }).start()
          setDragInfo(null)
          const relY = e.nativeEvent.pageY - boardTopRef.current
          const relX = e.nativeEvent.pageX - boardLeftRef.current
          if (relY >= 0 && relY < topRowHRef.current) {
            onDirectMoveRef.current({ type: 'waste-to-foundation' })
          } else if (relY >= topRowHRef.current) {
            const toCol = Math.round((relX - PAD) / (cardWRef.current + GAP))
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
  }, [measureBoard, overlayOpacity, overlayX, overlayY])

  const foundationPanResponder = useMemo(() => {
    const gs = { isDragging: false, activeFi: null as number | null }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: (e) => {
        measureBoard()
        gs.isDragging = false
        const relX = e.nativeEvent.pageX - boardLeftRef.current - PAD
        const fi = Math.floor(relX / (cardWRef.current + GAP))
        const pile = foundationRef.current[fi]
        gs.activeFi = (fi >= 0 && fi < 4 && pile && pile.length > 0) ? fi : null
      },
      onPanResponderMove: (e, g) => {
        if (gs.activeFi === null) return
        const pile = foundationRef.current[gs.activeFi]
        if (!pile || pile.length === 0) return
        if (Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD) {
          if (!gs.isDragging) {
            gs.isDragging = true
            const card = pile[pile.length - 1]!
            overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - cardWRef.current / 2)
            overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - cardHRef.current / 4)
            Animated.timing(overlayOpacity, { toValue: 0.9, duration: 80, useNativeDriver: false }).start()
            setDragInfo({ fromPile: 'foundation', colIndex: gs.activeFi, cardIndex: 0, cards: [card] })
          }
          overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - cardWRef.current / 2)
          overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - cardHRef.current / 4)
        }
      },
      onPanResponderRelease: (e) => {
        if (gs.isDragging) {
          gs.isDragging = false
          Animated.timing(overlayOpacity, { toValue: 0, duration: 120, useNativeDriver: false }).start()
          setDragInfo(null)
          if (gs.activeFi !== null) {
            const relY = e.nativeEvent.pageY - boardTopRef.current
            const relX = e.nativeEvent.pageX - boardLeftRef.current
            if (relY >= topRowHRef.current) {
              const toCol = Math.round((relX - PAD) / (cardWRef.current + GAP))
              const clampedCol = Math.max(0, Math.min(NUM_COLS - 1, toCol))
              onDirectMoveRef.current({
                type: 'foundation-to-tableau',
                from: { pile: 'foundation', index: gs.activeFi },
                to: { pile: 'tableau', index: clampedCol },
              })
            }
            gs.activeFi = null
          }
        } else if (gs.activeFi !== null) {
          onTapFoundationRef.current(gs.activeFi)
          gs.activeFi = null
        }
      },
      onPanResponderTerminate: () => {
        gs.isDragging = false
        gs.activeFi = null
        Animated.timing(overlayOpacity, { toValue: 0, duration: 80, useNativeDriver: false }).start()
        setDragInfo(null)
      },
    })
  }, [measureBoard, overlayOpacity, overlayX, overlayY])

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
      measureBoard()
      const gs = gestureState.current
      gs.isDragging = false
      const relX = e.nativeEvent.pageX - boardLeftRef.current
      const relY = e.nativeEvent.pageY - boardTopRef.current - topRowHRef.current
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
          overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - cardWRef.current / 2)
          overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - cardHRef.current / 4)
          Animated.timing(overlayOpacity, { toValue: 0.9, duration: 80, useNativeDriver: false }).start()
          const column = tableauRef.current[col] ?? []
          setDragInfo({ fromPile: 'tableau', colIndex: col, cardIndex: card, cards: column.slice(card) })
        }
        overlayX.setValue(e.nativeEvent.pageX - boardLeftRef.current - cardWRef.current / 2)
        overlayY.setValue(e.nativeEvent.pageY - boardTopRef.current - cardHRef.current / 4)
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
  }), [getCardAt, handleDrop, measureBoard, overlayOpacity, overlayX, overlayY])

  return (
    <View style={{ flex: 1 }} ref={boardRef} onLayout={measureBoard}>
      {/* Top row: foundation + stock/waste */}
      <View style={styles.topRow}>
        <View style={[styles.foundationRow, boardTouchFixStyle]} {...foundationPanResponder.panHandlers}>
          {foundation.map((pile, fi) => {
            const isFoundationSelected = selected?.pile === 'foundation' && selected.index === fi
            const isDraggedFromFoundation = dragInfo?.fromPile === 'foundation' && dragInfo.colIndex === fi
            return (
              <View
                key={`f-${fi}`}
                ref={el => { foundationViewRefs.current[fi] = el }}
                style={{ marginRight: fi < 3 ? GAP : 0 }}
              >
                {pile.length > 0 ? (
                  <CardView card={pile[pile.length - 1]} width={CARD_W} height={CARD_H} highlighted={isFoundationSelected} dimmed={isDraggedFromFoundation} />
                ) : (
                  <EmptySlot width={CARD_W} height={CARD_H} label={foundationLabels[fi]} />
                )}
              </View>
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
          <View ref={wasteViewRef} style={boardTouchFixStyle} {...wastePanResponder.panHandlers}>
            {waste.length > 0 ? (
              drawMode === 3 ? (
                <View style={{ width: CARD_W + WASTE_FAN_STEP * (Math.min(waste.length, 3) - 1), height: CARD_H }}>
                  {waste.slice(-3).map((card, idx, fanned) => (
                    <View
                      key={`${card.suit}-${card.rank}`}
                      style={{ position: idx === 0 ? 'relative' : 'absolute', top: 0, left: idx * WASTE_FAN_STEP }}
                    >
                      <CardView
                        card={card}
                        width={CARD_W}
                        height={CARD_H}
                        highlighted={idx === fanned.length - 1 && selected?.pile === 'waste'}
                        dimmed={idx === fanned.length - 1 && (dragInfo?.fromPile === 'waste' || (!!flyingCard && autoCompleteAnim?.from.pile === 'waste'))}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <CardView
                  card={waste[waste.length - 1]}
                  width={CARD_W}
                  height={CARD_H}
                  highlighted={selected?.pile === 'waste'}
                  dimmed={dragInfo?.fromPile === 'waste' || (!!flyingCard && autoCompleteAnim?.from.pile === 'waste')}
                />
              )
            ) : (
              <EmptySlot width={CARD_W} height={CARD_H} />
            )}
          </View>
        </View>
      </View>

      {/* Tableau */}
      <View style={[styles.tableau, boardTouchFixStyle]} {...panResponder.panHandlers}>
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
            <View
              key={`col-${ci}`}
              ref={el => { tableauColRefs.current[ci] = el }}
              style={{ width: CARD_W, height: colHeight, position: 'relative' }}
            >
              {col.map((card, cardi) => {
                const inStack =
                  selected?.pile === 'tableau' &&
                  selected.colIndex === ci &&
                  cardi >= selected.cardIndex
                const isDragged =
                  dragInfo?.fromPile === 'tableau' &&
                  dragInfo.colIndex === ci &&
                  cardi >= dragInfo.cardIndex
                const isFlyingFrom =
                  !!flyingCard &&
                  autoCompleteAnim?.from.pile === 'tableau' &&
                  autoCompleteAnim.from.col === ci &&
                  cardi === col.length - 1
                return (
                  <View key={`card-${ci}-${cardi}`} style={{ position: 'absolute', top: offsets[cardi] }}>
                    <CardView card={card} width={CARD_W} height={CARD_H} highlighted={inStack} dimmed={isDragged || isFlyingFrom} />
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

      {/* Auto-complete: 組札へ飛んでいくカード */}
      {flyingCard && (
        <Animated.View style={flyStyle} pointerEvents="none">
          <CardView card={flyingCard} width={CARD_W} height={CARD_H} />
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
    backgroundColor: vault.card,
    borderColor: gold.deep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: gold.accent,
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
    borderColor: 'rgba(255, 210, 48, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLabel: {
    fontSize: 18,
    color: 'rgba(255, 210, 48, 0.5)',
    fontWeight: 'bold',
  },
  highlight: {
    borderColor: gold.accent,
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
