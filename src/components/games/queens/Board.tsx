import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions, Animated } from 'react-native'
import { QueensState } from '../../../engines/queens/types'
import { GameIcon } from '../../ui/GameIcon'
import { measurePageOrigin, boardTouchFixStyle } from '../../../utils/boardCoords'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

const REGION_COLORS = [
  '#6B3A3A', '#6B5A2E', '#3D6B47', '#3D5570', '#5C4470',
  '#6B4A2E', '#2E6B68', '#4F6B3A', '#6B3A56', '#4A4038',
  '#3A4550', '#705A3D',
]

const DRAG_THRESHOLD = 8
const DOUBLE_TAP_MS = 280

type Props = {
  state: QueensState
  onPlaceCross: (row: number, col: number) => void
  onPlaceQueen: (row: number, col: number) => void
  onDragCross: (row: number, col: number) => void
  onDragRemoveCross: (row: number, col: number) => void
  flashWrongCell?: { row: number; col: number } | null
  lastCorrectCell?: { row: number; col: number } | null
}

export function QueensBoard({ state, onPlaceCross, onPlaceQueen, onDragCross, onDragRemoveCross, flashWrongCell, lastCorrectCell }: Props) {
  const { size, regions, current } = state
  const cellSize = Math.floor((SCREEN_WIDTH - BOARD_PADDING) / size)

  const boardRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })
  const stateRef = useRef(state)
  stateRef.current = state
  const queenScale = useRef(new Animated.Value(1)).current

  const measureBoard = useCallback(() => {
    requestAnimationFrame(() => {
      measurePageOrigin(boardRef.current, (origin) => {
        boardPosRef.current = origin
      })
    })
  }, [])

  const onPlaceCrossRef = useRef(onPlaceCross)
  const onPlaceQueenRef = useRef(onPlaceQueen)
  const onDragCrossRef = useRef(onDragCross)
  const onDragRemoveCrossRef = useRef(onDragRemoveCross)
  onPlaceCrossRef.current = onPlaceCross
  onPlaceQueenRef.current = onPlaceQueen
  onDragCrossRef.current = onDragCross
  onDragRemoveCrossRef.current = onDragRemoveCross

  useEffect(() => {
    if (lastCorrectCell) {
      queenScale.setValue(0.3)
      Animated.spring(queenScale, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }).start()
    }
  }, [lastCorrectCell, queenScale])

  const getCellAt = useCallback((pageX: number, pageY: number) => {
    const col = Math.floor((pageX - boardPosRef.current.x) / cellSize)
    const row = Math.floor((pageY - boardPosRef.current.y) / cellSize)
    if (row >= 0 && row < size && col >= 0 && col < size) return { row, col }
    return null
  }, [cellSize, size])

  const panResponder = useMemo(() => {
    let isDragging = false
    let dragMode: 'add' | 'remove' = 'add'
    let lastDragCell: string | null = null
    let tapTimer: ReturnType<typeof setTimeout> | null = null
    let pendingTapCell: string | null = null

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > DRAG_THRESHOLD || Math.abs(gs.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: (e) => {
        // スクロール/リサイズ後でも原点が最新になるよう都度測定（webでは同期）
        measurePageOrigin(boardRef.current, (origin) => {
          boardPosRef.current = origin
        })
        isDragging = false
        lastDragCell = null
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
        dragMode = cell && stateRef.current.current[cell.row]?.[cell.col] === 'crossed' ? 'remove' : 'add'
      },
      onPanResponderMove: (e, gs) => {
        if (Math.abs(gs.dx) > DRAG_THRESHOLD || Math.abs(gs.dy) > DRAG_THRESHOLD) {
          if (!isDragging) {
            isDragging = true
            if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; pendingTapCell = null }
          }
          const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
          if (cell) {
            const key = `${cell.row},${cell.col}`
            if (key !== lastDragCell) {
              lastDragCell = key
              if (dragMode === 'remove') {
                onDragRemoveCrossRef.current(cell.row, cell.col)
              } else {
                onDragCrossRef.current(cell.row, cell.col)
              }
            }
          }
        }
      },
      onPanResponderRelease: (e) => {
        if (isDragging) { isDragging = false; return }
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
        if (!cell) return
        const key = `${cell.row},${cell.col}`

        if (pendingTapCell === key && tapTimer) {
          clearTimeout(tapTimer)
          tapTimer = null
          pendingTapCell = null
          onPlaceQueenRef.current(cell.row, cell.col)
        } else {
          if (tapTimer) { clearTimeout(tapTimer) }
          pendingTapCell = key
          // Call immediately so cross appears without delay
          onPlaceCrossRef.current(cell.row, cell.col)
          // Timer only clears pendingTap state after double-tap window
          tapTimer = setTimeout(() => {
            tapTimer = null
            pendingTapCell = null
          }, DOUBLE_TAP_MS)
        }
      },
      onPanResponderTerminate: () => {
        isDragging = false
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; pendingTapCell = null }
      },
    })
  }, [getCellAt])

  return (
    <View
      ref={boardRef}
      onLayout={measureBoard}
      style={[styles.board, { width: cellSize * size, height: cellSize * size }, boardTouchFixStyle]}
      {...panResponder.panHandlers}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const regionId = regions[row]?.[col] ?? 0
            const bgColor = REGION_COLORS[regionId % REGION_COLORS.length] ?? '#232428'
            const cellState = current[row]?.[col] ?? 'empty'
            const isFlashing = flashWrongCell?.row === row && flashWrongCell?.col === col
            const isNewCorrect = lastCorrectCell?.row === row && lastCorrectCell?.col === col

            return (
              <View
                key={col}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize, backgroundColor: bgColor },
                  isFlashing && styles.cellFlash,
                ]}
              >
                {cellState === 'queen' && (
                  isNewCorrect ? (
                    <Animated.View style={{ transform: [{ scale: queenScale }] }}>
                      <GameIcon name="crown" size={cellSize * 0.55} color="#FFFFFF" />
                    </Animated.View>
                  ) : (
                    <GameIcon name="crown" size={cellSize * 0.55} color={isFlashing ? '#C9483B' : '#FFFFFF'} />
                  )
                )}
                {cellState === 'crossed' && (
                  <Text style={[styles.cross, { fontSize: cellSize * 0.5 }]}>×</Text>
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  board: {
    borderWidth: 2,
    borderColor: '#3A3C42',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(245, 244, 239, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFlash: {
    backgroundColor: 'rgba(201, 72, 59, 0.45)',
  },
  cross: {
    color: 'rgba(245, 244, 239, 0.6)',
    fontWeight: 'bold',
  },
})
