import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LibraState, CellValue, Constraint } from '../../../engines/libra/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

type Props = {
  state: LibraState
  onPressCell: (row: number, col: number) => void
}

function getConstraintBetween(
  constraints: Constraint[],
  r1: number,
  c1: number,
  r2: number,
  c2: number
): Constraint | undefined {
  return constraints.find(
    c => c.r1 === r1 && c.c1 === c1 && c.r2 === r2 && c.c2 === c2
  )
}

export function LibraBoard({ state, onPressCell }: Props) {
  const { size, current, initial, constraints } = state
  // Each cell takes cellSize, constraints between cells take constraintSize
  const constraintSize = 16
  const totalGaps = size - 1
  const cellSize = Math.floor(
    (SCREEN_WIDTH - BOARD_PADDING - totalGaps * constraintSize) / size
  )

  function renderCell(row: number, col: number) {
    const value = current[row]?.[col] ?? null
    const isFixed = initial[row]?.[col] !== null

    return (
      <TouchableOpacity
        key={`cell-${row}-${col}`}
        style={[
          styles.cell,
          { width: cellSize, height: cellSize },
          isFixed && styles.cellFixed,
        ]}
        onPress={() => onPressCell(row, col)}
        activeOpacity={isFixed ? 1 : 0.7}
        disabled={isFixed}
      >
        {value !== null && (
          <Text style={[styles.cellText, { fontSize: cellSize * 0.45 }, isFixed && styles.cellTextFixed]}>
            {value}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  function renderHorizontalConstraint(row: number, col: number) {
    const constraint = getConstraintBetween(constraints, row, col, row, col + 1)
    return (
      <View key={`hc-${row}-${col}`} style={[styles.constraintH, { width: constraintSize, height: cellSize }]}>
        {constraint && (
          <Text style={[styles.constraintText, constraint.type === 'neq' ? styles.constraintNeq : styles.constraintEq]}>
            {constraint.type === 'eq' ? '=' : '×'}
          </Text>
        )}
      </View>
    )
  }

  function renderVerticalConstraint(row: number, col: number) {
    const constraint = getConstraintBetween(constraints, row, col, row + 1, col)
    return (
      <View key={`vc-${row}-${col}`} style={[styles.constraintV, { width: cellSize, height: constraintSize }]}>
        {constraint && (
          <Text style={[styles.constraintText, constraint.type === 'neq' ? styles.constraintNeq : styles.constraintEq]}>
            {constraint.type === 'eq' ? '=' : '×'}
          </Text>
        )}
      </View>
    )
  }

  function renderRow(row: number) {
    const cells: React.ReactNode[] = []
    for (let col = 0; col < size; col++) {
      cells.push(renderCell(row, col))
      if (col < size - 1) {
        cells.push(renderHorizontalConstraint(row, col))
      }
    }
    return (
      <View key={`row-${row}`} style={styles.row}>
        {cells}
      </View>
    )
  }

  function renderConstraintRow(row: number) {
    const items: React.ReactNode[] = []
    for (let col = 0; col < size; col++) {
      items.push(renderVerticalConstraint(row, col))
      if (col < size - 1) {
        // spacer for the horizontal constraint gap
        items.push(
          <View key={`vc-spacer-${row}-${col}`} style={{ width: constraintSize, height: constraintSize }} />
        )
      }
    }
    return (
      <View key={`crow-${row}`} style={styles.row}>
        {items}
      </View>
    )
  }

  const rows: React.ReactNode[] = []
  for (let row = 0; row < size; row++) {
    rows.push(renderRow(row))
    if (row < size - 1) {
      rows.push(renderConstraintRow(row))
    }
  }

  return (
    <View style={styles.board}>
      {rows}
    </View>
  )
}

const styles = StyleSheet.create({
  board: {
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  cellFixed: {
    backgroundColor: '#e3f2fd',
  },
  cellText: {
    fontWeight: 'bold',
    color: '#333',
  },
  cellTextFixed: {
    color: '#1565c0',
  },
  constraintH: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  constraintV: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  constraintText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  constraintEq: {
    color: '#2e7d32',
  },
  constraintNeq: {
    color: '#c62828',
  },
})
