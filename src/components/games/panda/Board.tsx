import React, { useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { PandaState, CellContent } from '../../../engines/panda/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const HINT_SIZE = 28
const BOARD_PADDING = 32
const DOUBLE_TAP_MS = 280

type Props = {
  state: PandaState
  onPlaceCross: (row: number, col: number) => void
  onPlacePanda: (row: number, col: number) => void
}

export function PandaBoard({ state, onPlaceCross, onPlacePanda }: Props) {
  const { size, current, fixed, rowCounts, colCounts } = state
  const availableWidth = SCREEN_WIDTH - BOARD_PADDING - HINT_SIZE
  const cellSize = Math.floor(availableWidth / size)

  const boardRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })
  const onPlaceCrossRef = useRef(onPlaceCross)
  const onPlacePandaRef = useRef(onPlacePanda)
  onPlaceCrossRef.current = onPlaceCross
  onPlacePandaRef.current = onPlacePanda

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
    let tapTimer: ReturnType<typeof setTimeout> | null = null
    let pendingCell: string | null = null

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderRelease: (e) => {
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
        if (!cell) return
        const key = `${cell.row},${cell.col}`

        if (pendingCell === key && tapTimer) {
          clearTimeout(tapTimer)
          tapTimer = null
          pendingCell = null
          onPlacePandaRef.current(cell.row, cell.col)
        } else {
          if (tapTimer) clearTimeout(tapTimer)
          pendingCell = key
          tapTimer = setTimeout(() => {
            tapTimer = null
            pendingCell = null
            onPlaceCrossRef.current(cell.row, cell.col)
          }, DOUBLE_TAP_MS)
        }
      },
      onPanResponderTerminate: () => {
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; pendingCell = null }
      },
    })
  }, [getCellAt])

  function renderCellContent(row: number, col: number) {
    const cell = current[row]?.[col] ?? 'empty'
    const isFixed = fixed[row]?.[col] === 'A'

    if (isFixed || cell === 'A') {
      return <Text style={[styles.cellText, { fontSize: cellSize * 0.55 }]}>🎋</Text>
    }
    if (cell === 'B') {
      return <Text style={[styles.cellText, { fontSize: cellSize * 0.55 }]}>🐼</Text>
    }
    if (cell === 'crossed') {
      return <Text style={[styles.cellText, { fontSize: cellSize * 0.45 }, styles.cellTextCross]}>×</Text>
    }
    return null
  }

  const gridSize = cellSize * size

  return (
    <View>
      {/* Column hints row */}
      <View style={styles.row}>
        <View style={{ width: HINT_SIZE, height: HINT_SIZE }} />
        {colCounts.map((count, col) => (
          <View key={`ch-${col}`} style={[styles.hint, { width: cellSize, height: HINT_SIZE }]}>
            <Text style={styles.hintText}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Row clues + grid */}
      <View style={styles.gridRow}>
        {/* Row hints */}
        <View>
          {Array.from({ length: size }, (_, row) => (
            <View key={`rh-${row}`} style={[styles.hint, { width: HINT_SIZE, height: cellSize }]}>
              <Text style={styles.hintText}>{rowCounts[row]}</Text>
            </View>
          ))}
        </View>

        {/* Cell grid with PanResponder */}
        <View
          ref={boardRef}
          onLayout={measureBoard}
          style={{ width: gridSize, height: gridSize }}
          {...panResponder.panHandlers}
        >
          {Array.from({ length: size }, (_, row) => (
            <View key={`row-${row}`} style={[styles.row, { height: cellSize }]}>
              {Array.from({ length: size }, (_, col) => {
                const isFixed = fixed[row]?.[col] === 'A'
                return (
                  <View
                    key={`cell-${row}-${col}`}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize },
                      isFixed && styles.cellFixed,
                    ]}
                  >
                    {renderCellContent(row, col)}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  hint: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  cellFixed: {
    backgroundColor: '#e8f5e9',
  },
  cellText: {
    fontWeight: 'bold',
  },
  cellTextCross: {
    color: 'rgba(0,0,0,0.4)',
  },
})
