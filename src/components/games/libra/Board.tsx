import React, { useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { LibraState, CellValue, Constraint } from '../../../engines/libra/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 24
const DOUBLE_TAP_MS = 280
const CONSTRAINT_BOX = 14

type Props = {
  state: LibraState
  onPressCell: (row: number, col: number) => void
  flashWrongCell?: { row: number; col: number } | null
}

function getConstraintBetween(
  constraints: Constraint[],
  r1: number, c1: number,
  r2: number, c2: number
): Constraint | undefined {
  return constraints.find(c => c.r1 === r1 && c.c1 === c1 && c.r2 === r2 && c.c2 === c2)
}

export function LibraBoard({ state, onPressCell, flashWrongCell }: Props) {
  const { size, current, initial, constraints } = state
  const cellSize = Math.floor((SCREEN_WIDTH - BOARD_PADDING) / size)
  const boardSize = cellSize * size

  const boardRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })
  const onPressCellRef = useRef(onPressCell)
  onPressCellRef.current = onPressCell

  const measureBoard = useCallback(() => {
    requestAnimationFrame(() => {
      boardRef.current?.measureInWindow((x, y) => {
        boardPosRef.current = { x, y }
      })
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
      onPanResponderGrant: () => {
        // Re-measure for next gesture (async)
        boardRef.current?.measureInWindow((x, y) => { boardPosRef.current = { x, y } })
      },
      onPanResponderRelease: (e) => {
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
        if (!cell) return
        const key = `${cell.row},${cell.col}`

        if (pendingCell === key && tapTimer) {
          clearTimeout(tapTimer)
          tapTimer = null
          pendingCell = null
          onPressCellRef.current(cell.row, cell.col)
        } else {
          if (tapTimer) clearTimeout(tapTimer)
          pendingCell = key
          tapTimer = setTimeout(() => {
            tapTimer = null
            pendingCell = null
            onPressCellRef.current(cell.row, cell.col)
          }, DOUBLE_TAP_MS)
        }
      },
      onPanResponderTerminate: () => {
        if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; pendingCell = null }
      },
    })
  }, [getCellAt])

  return (
    <View style={{ position: 'relative' }}>
      {/* Cell grid */}
      <View
        ref={boardRef}
        onLayout={measureBoard}
        style={[styles.grid, { width: boardSize, height: boardSize }]}
        {...panResponder.panHandlers}
      >
        {Array.from({ length: size }, (_, row) => (
          <View key={`row-${row}`} style={[styles.row, { height: cellSize }]}>
            {Array.from({ length: size }, (_, col) => {
              const value = current[row]?.[col] ?? null
              const isFixed = initial[row]?.[col] !== null
              const isFlashing = flashWrongCell?.row === row && flashWrongCell?.col === col
              return (
                <View
                  key={`cell-${row}-${col}`}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                    isFixed && styles.cellFixed,
                    col === size - 1 && styles.cellRightBorder,
                    row === size - 1 && styles.cellBottomBorder,
                    isFlashing && styles.cellFlash,
                  ]}
                >
                  {value !== null && (
                    <Text
                      style={[
                        styles.cellText,
                        { fontSize: cellSize * 0.42 },
                        isFixed && styles.cellTextFixed,
                        value === 'A' && styles.cellTextA,
                        value === 'B' && styles.cellTextB,
                      ]}
                    >
                      {value === 'A' ? '☀️' : '🌙'}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        ))}
      </View>

      {/* Constraint overlays */}
      {constraints.map((c, i) => {
        const isHorizontal = c.r1 === c.r2
        const label = c.type === 'eq' ? '=' : '×'
        const textStyle = c.type === 'eq' ? styles.constraintEq : styles.constraintNeq

        if (isHorizontal) {
          const x = (c.c1 + 1) * cellSize - CONSTRAINT_BOX / 2
          const y = c.r1 * cellSize + cellSize / 2 - CONSTRAINT_BOX / 2
          return (
            <View
              key={`c-${i}`}
              style={[styles.constraintBox, { left: x, top: y }]}
              pointerEvents="none"
            >
              <Text style={[styles.constraintText, textStyle]}>{label}</Text>
            </View>
          )
        } else {
          const x = c.c1 * cellSize + cellSize / 2 - CONSTRAINT_BOX / 2
          const y = (c.r1 + 1) * cellSize - CONSTRAINT_BOX / 2
          return (
            <View
              key={`c-${i}`}
              style={[styles.constraintBox, { left: x, top: y }]}
              pointerEvents="none"
            >
              <Text style={[styles.constraintText, textStyle]}>{label}</Text>
            </View>
          )
        }
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#555',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  cellFixed: {
    backgroundColor: '#e8eaf6',
  },
  cellFlash: {
    backgroundColor: 'rgba(244, 67, 54, 0.35)',
  },
  cellRightBorder: {
    borderRightWidth: 2,
    borderRightColor: '#555',
  },
  cellBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: '#555',
  },
  cellText: {
    fontWeight: 'bold',
  },
  cellTextFixed: {},
  cellTextA: {
    color: '#e65100',
  },
  cellTextB: {
    color: '#1a237e',
  },
  constraintBox: {
    position: 'absolute',
    width: CONSTRAINT_BOX,
    height: CONSTRAINT_BOX,
    backgroundColor: '#fff',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constraintText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  constraintEq: {
    color: '#2e7d32',
  },
  constraintNeq: {
    color: '#c62828',
  },
})
