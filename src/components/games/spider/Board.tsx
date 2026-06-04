import React, { useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, PanResponder } from 'react-native'
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

const SUIT_SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS = new Set<Suit>(['hearts', 'diamonds'])
const RANK_LABEL: Partial<Record<number, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

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
  onDeal: () => void
}

export function SpiderBoard({ state, selected, onTapTableau, onDeal }: Props) {
  const { tableau, stock, foundation } = state

  const boardRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })
  const tableauRef = useRef(tableau)
  tableauRef.current = tableau
  const onTapTableauRef = useRef(onTapTableau)
  onTapTableauRef.current = onTapTableau

  const measureBoard = useCallback(() => {
    boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      boardPosRef.current = { x: pageX, y: pageY }
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
    if (relY > offsets[lastIdx]! + CARD_H) return null

    for (let i = lastIdx; i >= 0; i--) {
      if (relY >= offsets[i]!) return { col, cardIndex: i }
    }
    return { col, cardIndex: 0 }
  }, [])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
        boardPosRef.current = { x: pageX, y: pageY }
      })
    },
    onPanResponderRelease: (e) => {
      const relX = e.nativeEvent.pageX - boardPosRef.current.x
      const relY = e.nativeEvent.pageY - boardPosRef.current.y
      const hit = getColAndCard(relX, relY)
      if (hit) onTapTableauRef.current(hit.col, hit.cardIndex)
    },
  }), [getColAndCard])

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
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>完成: {foundation}/8</Text>
        <TouchableOpacity
          onPress={onDeal}
          disabled={stock.length === 0}
          style={[styles.dealBtn, stock.length === 0 && styles.dealBtnDisabled]}
        >
          <Text style={styles.dealBtnText}>配る ({stock.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Tableau */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View
          ref={boardRef}
          onLayout={measureBoard}
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
                      />
                    </View>
                  )
                })
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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
  statusText: {
    color: '#c8e6c9',
    fontSize: 13,
    fontWeight: '600',
  },
  dealBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dealBtnDisabled: {
    opacity: 0.4,
  },
  dealBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tableau: {
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: PAD,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
})
