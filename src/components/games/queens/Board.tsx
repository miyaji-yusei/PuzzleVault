import React, { useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { QueensState } from '../../../engines/queens/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

const REGION_COLORS = [
  '#f28b82', '#fbbc04', '#34a853', '#4285f4', '#a142f4',
  '#ff6d00', '#00bcd4', '#8bc34a', '#e91e63', '#795548',
  '#607d8b', '#ff5722',
]

const DOUBLE_TAP_MS = 280
const DRAG_THRESHOLD = 8

type Props = {
  state: QueensState
  onPlaceCross: (row: number, col: number) => void
  onPlaceQueen: (row: number, col: number) => void
  onDragCross: (row: number, col: number) => void
}

export function QueensBoard({ state, onPlaceCross, onPlaceQueen, onDragCross }: Props) {
  const { size, regions, current } = state
  const cellSize = Math.floor((SCREEN_WIDTH - BOARD_PADDING) / size)

  const boardRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })

  const onPlaceCrossRef = useRef(onPlaceCross)
  const onPlaceQueenRef = useRef(onPlaceQueen)
  const onDragCrossRef = useRef(onDragCross)
  onPlaceCrossRef.current = onPlaceCross
  onPlaceQueenRef.current = onPlaceQueen
  onDragCrossRef.current = onDragCross

  const measureBoard = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      boardPosRef.current = { x, y }
    })
  }, [])

  const getCellAt = useCallback((pageX: number, pageY: number) => {
    const col = Math.floor((pageX - boardPosRef.current.x) / cellSize)
    const row = Math.floor((pageY - boardPosRef.current.y) / cellSize)
    if (row >= 0 && row < size && col >= 0 && col < size) return { row, col }
    return null
  }, [cellSize, size])

  const panResponder = useMemo(() => {
    let touchStartTime = 0
    let isDragging = false
    let lastDragCell: string | null = null
    let tapTimer: ReturnType<typeof setTimeout> | null = null
    let pendingTapCell: string | null = null

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > DRAG_THRESHOLD || Math.abs(gs.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: (e) => {
        touchStartTime = Date.now()
        isDragging = false
        lastDragCell = null
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
              onDragCrossRef.current(cell.row, cell.col)
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
          // ダブルタップ: ♕ を配置
          clearTimeout(tapTimer)
          tapTimer = null
          pendingTapCell = null
          onPlaceQueenRef.current(cell.row, cell.col)
        } else {
          // 最初のタップ: 待機してシングルタップか確認
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

            return (
              <View
                key={col}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize, backgroundColor: bgColor },
                ]}
              >
                {cellState === 'queen' && (
                  <Text style={[styles.queen, { fontSize: cellSize * 0.55 }]}>♛</Text>
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
  queen: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cross: {
    color: 'rgba(0,0,0,0.5)',
    fontWeight: 'bold',
  },
})
