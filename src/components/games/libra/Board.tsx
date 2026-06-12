import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { LibraState, CellValue, Constraint } from '../../../engines/libra/types'
import { GameIcon } from '../../ui/GameIcon'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 24
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
    boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      boardPosRef.current = { x: pageX, y: pageY }
    })
  }, [])

  useEffect(() => { measureBoard() }, [measureBoard])

  const getCellAt = useCallback((pageX: number, pageY: number) => {
    const col = Math.floor((pageX - boardPosRef.current.x) / cellSize)
    const row = Math.floor((pageY - boardPosRef.current.y) / cellSize)
    if (row >= 0 && row < size && col >= 0 && col < size) return { row, col }
    return null
  }, [cellSize, size])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: () => {
      boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => { boardPosRef.current = { x: pageX, y: pageY } })
    },
    onPanResponderRelease: (e) => {
      const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
      if (cell) onPressCellRef.current(cell.row, cell.col)
    },
    onPanResponderTerminate: () => {},
  }), [getCellAt])

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
                    <GameIcon
                      name={value === 'A' ? 'sun' : 'moon'}
                      size={Math.floor(cellSize * 0.55)}
                      color="#FFFFFF"
                    />
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
    borderColor: '#3A3C42',
    backgroundColor: '#17181B',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderColor: '#2E3036',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#232428',
  },
  cellFixed: {
    backgroundColor: '#17181B',
  },
  cellFlash: {
    backgroundColor: 'rgba(244, 67, 54, 0.35)',
  },
  cellRightBorder: {
    borderRightWidth: 2,
    borderRightColor: '#3A3C42',
  },
  cellBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: '#3A3C42',
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
    backgroundColor: '#3A3C42',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constraintText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  constraintEq: {
    color: '#2FA876',
  },
  constraintNeq: {
    color: '#E06D60',
  },
})
