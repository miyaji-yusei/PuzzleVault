import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions, Animated } from 'react-native'
import { QueensState } from '../../../engines/queens/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

const REGION_COLORS = [
  '#f28b82', '#fbbc04', '#34a853', '#4285f4', '#a142f4',
  '#ff6d00', '#00bcd4', '#8bc34a', '#e91e63', '#795548',
  '#607d8b', '#ff5722',
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
      boardRef.current?.measureInWindow((x, y) => {
        boardPosRef.current = { x, y }
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
  }, [lastCorrectCell?.row, lastCorrectCell?.col, queenScale])

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
          tapTimer = setTimeout(() => {
            tapTimer = null
            pendingTapCell = null
            onPlaceCrossRef.current(cell.row, cell.col)
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
      style={[styles.board, { width: cellSize * size, height: cellSize * size }]}
      {...panResponder.panHandlers}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const regionId = regions[row]?.[col] ?? 0
            const bgColor = REGION_COLORS[regionId % REGION_COLORS.length] ?? '#ccc'
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
                    <Animated.Text
                      style={[styles.queen, { fontSize: cellSize * 0.55, transform: [{ scale: queenScale }] }]}
                    >
                      ♛
                    </Animated.Text>
                  ) : (
                    <Text
                      style={[styles.queen, { fontSize: cellSize * 0.55 }, isFlashing && styles.queenWrong]}
                    >
                      ♛
                    </Text>
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
    borderColor: '#333',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFlash: {
    backgroundColor: 'rgba(244, 67, 54, 0.4)',
  },
  queen: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  queenWrong: {
    color: '#f44336',
    textShadowColor: 'rgba(0,0,0,0.3)',
  },
  cross: {
    color: 'rgba(0,0,0,0.5)',
    fontWeight: 'bold',
  },
})
