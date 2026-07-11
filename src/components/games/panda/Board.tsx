import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { PandaState } from '../../../engines/panda/types'
import { GameIcon } from '../../ui/GameIcon'
import { measurePageOrigin, boardTouchFixStyle } from '../../../utils/boardCoords'

const SCREEN_WIDTH = Dimensions.get('window').width
const HINT_SIZE = 28
const BOARD_PADDING = 32
const DRAG_THRESHOLD = 5

type Props = {
  state: PandaState
  confirmedCells: Set<string>
  errorCell: { row: number; col: number } | null
  onPressCell: (row: number, col: number) => void
  onDragCross: (row: number, col: number) => void
  onDragRemoveCross: (row: number, col: number) => void
}

export function PandaBoard({ state, confirmedCells, errorCell, onPressCell, onDragCross, onDragRemoveCross }: Props) {
  const { size, current, fixed, rowCounts, colCounts } = state
  const availableWidth = SCREEN_WIDTH - BOARD_PADDING - HINT_SIZE
  const cellSize = Math.floor(availableWidth / size)

  const gridRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })
  const onPressCellRef = useRef(onPressCell)
  const onDragCrossRef = useRef(onDragCross)
  const onDragRemoveCrossRef = useRef(onDragRemoveCross)
  const stateRef = useRef(state)
  onPressCellRef.current = onPressCell
  onDragCrossRef.current = onDragCross
  onDragRemoveCrossRef.current = onDragRemoveCross
  stateRef.current = state

  const lastDragCellRef = useRef<string | null>(null)

  const measureGrid = useCallback(() => {
    measurePageOrigin(gridRef.current, (origin) => {
      boardPosRef.current = origin
    })
  }, [])

  useEffect(() => { measureGrid() }, [measureGrid])

  const getCellAt = useCallback((pageX: number, pageY: number) => {
    const col = Math.floor((pageX - boardPosRef.current.x) / cellSize)
    const row = Math.floor((pageY - boardPosRef.current.y) / cellSize)
    if (row >= 0 && row < size && col >= 0 && col < size) return { row, col }
    return null
  }, [cellSize, size])

  const panResponder = useMemo(() => {
    let isDragging = false
    let dragMode: 'add' | 'remove' = 'add'

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > DRAG_THRESHOLD || Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: () => {
        measureGrid()
        isDragging = false
        dragMode = 'add'
        lastDragCellRef.current = null
      },
      onPanResponderMove: (e) => {
        isDragging = true
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
        if (!cell) return
        const key = `${cell.row},${cell.col}`
        // Detect drag mode from the first cell encountered
        if (lastDragCellRef.current === null) {
          const content = stateRef.current.current[cell.row]?.[cell.col]
          dragMode = content === 'crossed' ? 'remove' : 'add'
        }
        if (key === lastDragCellRef.current) return
        lastDragCellRef.current = key
        if (dragMode === 'remove') {
          onDragRemoveCrossRef.current(cell.row, cell.col)
        } else {
          onDragCrossRef.current(cell.row, cell.col)
        }
      },
      onPanResponderRelease: (e) => {
        if (!isDragging) {
          const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
          if (cell) onPressCellRef.current(cell.row, cell.col)
        }
        isDragging = false
        dragMode = 'add'
        lastDragCellRef.current = null
      },
      onPanResponderTerminate: () => {
        isDragging = false
        dragMode = 'add'
        lastDragCellRef.current = null
      },
    })
  }, [getCellAt])

  // Compute row/col panda counts for color hints
  const rowPandaCounts = Array.from({ length: size }, (_, r) =>
    (current[r] ?? []).filter(c => c === 'B').length
  )
  const colPandaCounts = Array.from({ length: size }, (_, col) =>
    current.reduce((acc, row) => acc + (row[col] === 'B' ? 1 : 0), 0)
  )

  function renderCellContent(row: number, col: number) {
    const cell = current[row]?.[col] ?? 'empty'
    const isFixed = fixed[row]?.[col] === 'A'
    const isError = errorCell?.row === row && errorCell?.col === col
    const isConfirmed = confirmedCells.has(`${row},${col}`)

    if (isFixed || cell === 'A') {
      return <GameIcon name="bamboo" size={Math.floor(cellSize * 0.62)} color="#C9C7BD" />
    }
    if (cell === 'B') {
      return (
        <View style={[isError && styles.cellTextError, isConfirmed && styles.cellTextConfirmed]}>
          <GameIcon
            name="panda"
            size={Math.floor(cellSize * 0.66)}
            color="#FFFFFF"
          />
        </View>
      )
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
        {colCounts.map((count, col) => {
          const isComplete = colPandaCounts[col] === count
          return (
            <View key={`ch-${col}`} style={[styles.hint, { width: cellSize, height: HINT_SIZE }]}>
              <Text style={[styles.hintText, isComplete && styles.hintTextComplete]}>{count}</Text>
            </View>
          )
        })}
      </View>

      {/* Row clues + grid */}
      <View style={styles.gridRow}>
        {/* Row hints */}
        <View>
          {Array.from({ length: size }, (_, row) => {
            const isComplete = rowPandaCounts[row] === rowCounts[row]
            return (
              <View key={`rh-${row}`} style={[styles.hint, { width: HINT_SIZE, height: cellSize }]}>
                <Text style={[styles.hintText, isComplete && styles.hintTextComplete]}>{rowCounts[row]}</Text>
              </View>
            )
          })}
        </View>

        {/* Cell grid with PanResponder */}
        <View
          ref={gridRef}
          onLayout={measureGrid}
          style={[{ width: gridSize, height: gridSize }, boardTouchFixStyle]}
          {...panResponder.panHandlers}
        >
          {Array.from({ length: size }, (_, row) => (
            <View key={`row-${row}`} style={[styles.row, { height: cellSize }]}>
              {Array.from({ length: size }, (_, col) => {
                const isFixed = fixed[row]?.[col] === 'A'
                const isError = errorCell?.row === row && errorCell?.col === col
                const cell = current[row]?.[col] ?? 'empty'
                const isCrossed = cell === 'crossed'
                return (
                  <View
                    key={`cell-${row}-${col}`}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize },
                      isFixed && styles.cellFixed,
                      isCrossed && styles.cellCrossed,
                      isError && styles.cellError,
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
    color: '#FFFFFF',
  },
  hintTextComplete: {
    color: '#2FA876',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#2E3036',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#232428',
  },
  cellFixed: {
    backgroundColor: '#17181B',
  },
  cellCrossed: {
    backgroundColor: 'rgba(255, 210, 48, 0.12)',
  },
  cellError: {
    backgroundColor: 'rgba(201, 72, 59, 0.35)',
  },
  cellText: {
    fontWeight: 'bold',
  },
  cellTextError: {
    opacity: 0.7,
  },
  cellTextConfirmed: {
    opacity: 1,
  },
  cellTextCross: {
    color: 'rgba(255, 210, 48, 0.55)',
  },
})
