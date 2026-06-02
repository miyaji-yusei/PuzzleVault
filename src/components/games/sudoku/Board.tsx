import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { SudokuState } from '../../../engines/sudoku/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_SIZE = SCREEN_WIDTH - 32
const CELL_SIZE = BOARD_SIZE / 9

type Props = {
  state: SudokuState
  selectedCell: [number, number] | null
  wrongCells: Set<string>
  onSelectCell: (row: number, col: number) => void
}

export function SudokuBoard({ state, selectedCell, wrongCells, onSelectCell }: Props) {
  const { board, current } = state

  function getCellStyle(row: number, col: number) {
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col
    const isSameRow = selectedCell?.[0] === row
    const isSameCol = selectedCell?.[1] === col
    const isSameBox =
      selectedCell !== null &&
      Math.floor(selectedCell[0] / 3) === Math.floor(row / 3) &&
      Math.floor(selectedCell[1] / 3) === Math.floor(col / 3)

    return [
      styles.cell,
      col % 3 === 2 && col !== 8 && styles.cellBorderRight,
      row % 3 === 2 && row !== 8 && styles.cellBorderBottom,
      isSelected && styles.cellSelected,
      !isSelected && (isSameRow || isSameCol || isSameBox) && styles.cellHighlight,
    ]
  }

  function getTextStyle(row: number, col: number) {
    const isPreFilled = board[row]?.[col] !== null
    const isWrong = wrongCells.has(`${row}-${col}`)
    return [
      styles.cellText,
      isPreFilled ? styles.textPreFilled : styles.textUserFilled,
      isWrong && styles.textWrong,
    ]
  }

  return (
    <View style={styles.board}>
      {Array.from({ length: 9 }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: 9 }, (_, col) => {
            const value = current[row]?.[col] ?? null
            return (
              <TouchableOpacity
                key={col}
                style={getCellStyle(row, col)}
                onPress={() => onSelectCell(row, col)}
                activeOpacity={0.7}
              >
                {value !== null && (
                  <Text style={getTextStyle(row, col)}>{value}</Text>
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
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBorderRight: {
    borderRightWidth: 2,
    borderRightColor: '#333',
  },
  cellBorderBottom: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  cellSelected: {
    backgroundColor: '#b8d4f8',
  },
  cellHighlight: {
    backgroundColor: '#e8f1fb',
  },
  cellText: {
    fontSize: CELL_SIZE * 0.55,
    fontWeight: '500',
  },
  textPreFilled: {
    color: '#333',
    fontWeight: 'bold',
  },
  textUserFilled: {
    color: '#1a6db5',
  },
  textWrong: {
    color: '#e53935',
  },
})
