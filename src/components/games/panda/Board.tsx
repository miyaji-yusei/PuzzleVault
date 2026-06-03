import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { PandaState, CellContent } from '../../../engines/panda/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const HINT_SIZE = 28
const BOARD_PADDING = 32

type Props = {
  state: PandaState
  onPressCell: (row: number, col: number) => void
}

export function PandaBoard({ state, onPressCell }: Props) {
  const { size, current, fixed, rowCounts, colCounts } = state
  const availableWidth = SCREEN_WIDTH - BOARD_PADDING - HINT_SIZE
  const cellSize = Math.floor(availableWidth / size)

  function renderCell(row: number, col: number) {
    const cell = current[row]?.[col] ?? 'empty'
    const isFixed = fixed[row]?.[col] === 'A'

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
        {cell === 'A' && (
          <Text style={[styles.cellText, { fontSize: cellSize * 0.5 }, styles.cellTextA]}>A</Text>
        )}
        {cell === 'B' && (
          <Text style={[styles.cellText, { fontSize: cellSize * 0.5 }, styles.cellTextB]}>B</Text>
        )}
        {cell === 'crossed' && (
          <Text style={[styles.cellText, { fontSize: cellSize * 0.45 }, styles.cellTextCross]}>×</Text>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View>
      {/* Column hints row */}
      <View style={styles.row}>
        {/* Corner spacer */}
        <View style={{ width: HINT_SIZE, height: HINT_SIZE }} />
        {colCounts.map((count, col) => (
          <View key={`ch-${col}`} style={[styles.hint, { width: cellSize, height: HINT_SIZE }]}>
            <Text style={styles.hintText}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Grid rows with row hints */}
      {Array.from({ length: size }, (_, row) => (
        <View key={`row-${row}`} style={styles.row}>
          <View style={[styles.hint, { width: HINT_SIZE, height: cellSize }]}>
            <Text style={styles.hintText}>{rowCounts[row]}</Text>
          </View>
          {Array.from({ length: size }, (_, col) => renderCell(row, col))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#fff9c4',
  },
  cellText: {
    fontWeight: 'bold',
  },
  cellTextA: {
    color: '#e65100',
  },
  cellTextB: {
    color: '#1565c0',
  },
  cellTextCross: {
    color: 'rgba(0,0,0,0.4)',
  },
})
