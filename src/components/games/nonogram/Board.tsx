import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { NonogramState, CellState } from '../../../engines/nonogram/types'
import { NonogramMode } from '../../../hooks/useNonogramGame'

const SCREEN_WIDTH = Dimensions.get('window').width
const MAX_BOARD = SCREEN_WIDTH - 32
const AXIS_THRESHOLD = 6

type Props = {
  state: NonogramState
  mode: NonogramMode
  onSetCell: (row: number, col: number) => void
  onSetCellTo: (row: number, col: number, target: CellState) => void
}

export function NonogramBoard({ state, mode, onSetCell, onSetCellTo }: Props) {
  const { size, rowClues, colClues, current } = state

  const maxRowClues = Math.max(...rowClues.map(c => c.length))
  const maxColClues = Math.max(...colClues.map(c => c.length))

  const clueAreaWidth = maxRowClues * 18
  const clueAreaHeight = maxColClues * 16
  const cellSize = Math.min(Math.floor((MAX_BOARD - clueAreaWidth) / size), 28)

  const gridRef = useRef<View>(null)
  const gridPosRef = useRef({ x: 0, y: 0 })

  const measureGrid = useCallback(() => {
    gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      gridPosRef.current = { x: pageX, y: pageY }
    })
  }, [])

  useEffect(() => { measureGrid() }, [measureGrid])
  const onSetCellRef = useRef(onSetCell)
  const onSetCellToRef = useRef(onSetCellTo)
  onSetCellRef.current = onSetCell
  onSetCellToRef.current = onSetCellTo

  const currentRef = useRef(current)
  currentRef.current = current
  const modeRef = useRef(mode)
  modeRef.current = mode

  // State for the current gesture
  const paintTargetRef = useRef<CellState>('filled')
  const dragAxisRef = useRef<'h' | 'v' | null>(null)
  const dragStartRef = useRef({ row: 0, col: 0 })
  const lastCellRef = useRef<string | null>(null)

  const getCellCoords = useCallback((pageX: number, pageY: number) => {
    const col = Math.floor((pageX - gridPosRef.current.x) / cellSize)
    const row = Math.floor((pageY - gridPosRef.current.y) / cellSize)
    return { row, col }
  }, [cellSize])

  const applyCell = useCallback((row: number, col: number) => {
    if (row < 0 || row >= size || col < 0 || col >= size) return
    const key = `${row},${col}`
    if (key === lastCellRef.current) return
    lastCellRef.current = key
    onSetCellToRef.current(row, col, paintTargetRef.current)
  }, [size])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => { gridPosRef.current = { x: pageX, y: pageY } })
      dragAxisRef.current = null
      lastCellRef.current = null

      const { pageX, pageY } = e.nativeEvent
      const startCol = Math.floor((pageX - gridPosRef.current.x) / cellSize)
      const startRow = Math.floor((pageY - gridPosRef.current.y) / cellSize)
      dragStartRef.current = { row: startRow, col: startCol }

      const currentCellState = currentRef.current[startRow]?.[startCol] ?? 'empty'
      const targetFill: CellState = modeRef.current === 'fill' ? 'filled' : 'crossed'
      paintTargetRef.current = currentCellState === targetFill ? 'empty' : targetFill

      applyCell(startRow, startCol)
    },
    onPanResponderMove: (e, g) => {
      if (dragAxisRef.current === null) {
        if (Math.abs(g.dx) > AXIS_THRESHOLD || Math.abs(g.dy) > AXIS_THRESHOLD) {
          dragAxisRef.current = Math.abs(g.dx) >= Math.abs(g.dy) ? 'h' : 'v'
        } else {
          return
        }
      }

      if (dragAxisRef.current === 'h') {
        const col = Math.floor((e.nativeEvent.pageX - gridPosRef.current.x) / cellSize)
        applyCell(dragStartRef.current.row, col)
      } else {
        const row = Math.floor((e.nativeEvent.pageY - gridPosRef.current.y) / cellSize)
        applyCell(row, dragStartRef.current.col)
      }
    },
    onPanResponderRelease: () => {
      lastCellRef.current = null
      dragAxisRef.current = null
    },
  }), [applyCell, cellSize])

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
