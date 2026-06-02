import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { QueensState } from '../../../engines/queens/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

// 10 distinct region colors
const REGION_COLORS = [
  '#f28b82', '#fbbc04', '#34a853', '#4285f4', '#a142f4',
  '#ff6d00', '#00bcd4', '#8bc34a', '#e91e63', '#795548',
  '#607d8b', '#ff5722',
]

type Props = {
  state: QueensState
  onToggleCell: (row: number, col: number) => void
}

export function QueensBoard({ state, onToggleCell }: Props) {
  const { size, regions, current } = state
  const cellSize = Math.floor((SCREEN_WIDTH - BOARD_PADDING) / size)

  return (
    <View style={[styles.board, { width: cellSize * size, height: cellSize * size }]}>
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const regionId = regions[row]?.[col] ?? 0
            const bgColor = REGION_COLORS[regionId % REGION_COLORS.length] ?? '#ccc'
            const cellState = current[row]?.[col] ?? 'empty'

            return (
              <TouchableOpacity
                key={col}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize, backgroundColor: bgColor },
                ]}
                onPress={() => onToggleCell(row, col)}
                activeOpacity={0.8}
              >
                {cellState === 'queen' && (
                  <Text style={[styles.queen, { fontSize: cellSize * 0.55 }]}>♛</Text>
                )}
                {cellState === 'crossed' && (
                  <Text style={[styles.cross, { fontSize: cellSize * 0.5 }]}>×</Text>
                )}
              </TouchableOpacity>
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
