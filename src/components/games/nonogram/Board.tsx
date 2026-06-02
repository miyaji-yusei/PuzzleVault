import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native'
import { NonogramState, CellState } from '../../../engines/nonogram/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const MAX_BOARD = SCREEN_WIDTH - 32

type Props = {
  state: NonogramState
  onToggleCell: (row: number, col: number) => void
}

export function NonogramBoard({ state, onToggleCell }: Props) {
  const { size, rowClues, colClues, current } = state

  const maxRowClues = Math.max(...rowClues.map(c => c.length))
  const maxColClues = Math.max(...colClues.map(c => c.length))

  const clueAreaWidth = maxRowClues * 18
  const clueAreaHeight = maxColClues * 16
  const cellSize = Math.min(Math.floor((MAX_BOARD - clueAreaWidth) / size), 28)

  function getCellBg(cell: CellState): string {
    if (cell === 'filled') return '#333'
    if (cell === 'crossed') return '#f5f5f5'
    return '#fff'
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
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

          {/* Grid rows */}
          {Array.from({ length: size }, (_, row) => (
            <View key={row} style={styles.row}>
              {/* Row clues */}
              <View style={[styles.rowClueCell, { width: clueAreaWidth, height: cellSize }]}>
                {rowClues[row]?.map((n, i) => (
                  <Text key={i} style={styles.clueText}>{n === 0 ? '' : n}</Text>
                ))}
              </View>

              {/* Grid cells */}
              {Array.from({ length: size }, (_, col) => {
                const cell = current[row]?.[col] ?? 'empty'
                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize, backgroundColor: getCellBg(cell) },
                      col % 5 === 4 && styles.cellBorderRightThick,
                      row % 5 === 4 && styles.cellBorderBottomThick,
                    ]}
                    onPress={() => onToggleCell(row, col)}
                    activeOpacity={0.8}
                  >
                    {cell === 'crossed' && (
                      <Text style={[styles.crossText, { fontSize: cellSize * 0.6 }]}>×</Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
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
