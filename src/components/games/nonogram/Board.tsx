import React, { useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { NonogramState, CellState } from '../../../engines/nonogram/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const MAX_BOARD = SCREEN_WIDTH - 32

type Props = {
  state: NonogramState
  onSetCell: (row: number, col: number) => void
}

export function NonogramBoard({ state, onSetCell }: Props) {
  const { size, rowClues, colClues, current } = state

  const maxRowClues = Math.max(...rowClues.map(c => c.length))
  const maxColClues = Math.max(...colClues.map(c => c.length))

  const clueAreaWidth = maxRowClues * 18
  const clueAreaHeight = maxColClues * 16
  const cellSize = Math.min(Math.floor((MAX_BOARD - clueAreaWidth) / size), 28)

  const gridRef = useRef<View>(null)
  const gridPosRef = useRef({ x: 0, y: 0 })
  const lastCellRef = useRef<string | null>(null)
  const onSetCellRef = useRef(onSetCell)
  onSetCellRef.current = onSetCell

  const measureGrid = useCallback(() => {
    gridRef.current?.measureInWindow((x, y) => {
      gridPosRef.current = { x, y }
    })
  }, [])

  const applyAt = useCallback((pageX: number, pageY: number) => {
    const col = Math.floor((pageX - gridPosRef.current.x) / cellSize)
    const row = Math.floor((pageY - gridPosRef.current.y) / cellSize)
    if (row < 0 || row >= size || col < 0 || col >= size) return
    const key = `${row},${col}`
    if (key === lastCellRef.current) return
    lastCellRef.current = key
    onSetCellRef.current(row, col)
  }, [cellSize, size])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      lastCellRef.current = null
      applyAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
    },
    onPanResponderMove: (e) => {
      applyAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
    },
    onPanResponderRelease: () => { lastCellRef.current = null },
  }), [applyAt])

  function getCellBg(cell: CellState): string {
    if (cell === 'filled') return '#333'
    return '#fff'
  }

  const gridWidth = cellSize * size
  const gridHeight = cellSize * size

  return (
    <View>
      {/* Column clues row */}
      <View style={styles.colCluesRow}>
        <View style={{ width: clueAreaWidth, height: clueAreaHeight }} />
        {Array.from({ length: size }, (_, col) => (
          <View key={col} style={[styles.clueCell, { width: cellSize, height: clueAreaHeight }]}>
            {colClues[col]?.map((n, i) => (
              <Text key={i} style={styles.clueText}>{n === 0 ? '' : n}</Text>
            ))}
          </View>
        ))}
      </View>

      {/* Row clues + grid */}
      <View style={styles.gridRow}>
        {/* Row clues column */}
        <View>
          {Array.from({ length: size }, (_, row) => (
            <View key={row} style={[styles.rowClueCell, { width: clueAreaWidth, height: cellSize }]}>
              {rowClues[row]?.map((n, i) => (
                <Text key={i} style={styles.clueText}>{n === 0 ? '' : n}</Text>
              ))}
            </View>
          ))}
        </View>

        {/* Cell grid with PanResponder */}
        <View
          ref={gridRef}
          onLayout={measureGrid}
          style={{ width: gridWidth, height: gridHeight }}
          {...panResponder.panHandlers}
        >
          {Array.from({ length: size }, (_, row) => (
            <View key={row} style={[styles.row, { height: cellSize }]}>
              {Array.from({ length: size }, (_, col) => {
                const cell = current[row]?.[col] ?? 'empty'
                return (
                  <View
                    key={col}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize, backgroundColor: getCellBg(cell) },
                      col % 5 === 4 && col !== size - 1 && styles.cellBorderRightThick,
                      row % 5 === 4 && row !== size - 1 && styles.cellBorderBottomThick,
                    ]}
                  >
                    {cell === 'crossed' && (
                      <Text style={[styles.crossText, { fontSize: cellSize * 0.6 }]}>×</Text>
                    )}
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
  colCluesRow: {
    flexDirection: 'row',
  },
  clueCell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderLeftWidth: 0.5,
    borderColor: '#ccc',
    paddingBottom: 2,
  },
  rowClueCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 4,
    gap: 2,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
  },
  clueText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    lineHeight: 15,
  },
  gridRow: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBorderRightThick: {
    borderRightWidth: 2,
    borderRightColor: '#666',
  },
  cellBorderBottomThick: {
    borderBottomWidth: 2,
    borderBottomColor: '#666',
  },
  crossText: {
    color: '#999',
    fontWeight: 'bold',
  },
})
