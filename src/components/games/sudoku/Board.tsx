import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { SudokuState } from '../../../engines/sudoku/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_SIZE = SCREEN_WIDTH - 32
const CELL_SIZE = BOARD_SIZE / 9
const NOTE_SIZE = CELL_SIZE / 3

type Props = {
  state: SudokuState
  selectedCell: [number, number] | null
  wrongCells: Set<string>
  onSelectCell: (row: number, col: number) => void
}

export function SudokuBoard({ state, selectedCell, wrongCells, onSelectCell }: Props) {
  const { board, current, notes } = state

  const selectedValue = selectedCell
    ? (current[selectedCell[0]]?.[selectedCell[1]] ?? null)
    : null

  function getCellStyle(row: number, col: number) {
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col
    const isSameRow = selectedCell?.[0] === row
    const isSameCol = selectedCell?.[1] === col
    const isSameBox =
      selectedCell !== null &&
      Math.floor(selectedCell[0] / 3) === Math.floor(row / 3) &&
      Math.floor(selectedCell[1] / 3) === Math.floor(col / 3)
    const cellValue = current[row]?.[col] ?? null
    const isSameNumber =
      !isSelected && selectedValue !== null && cellValue === selectedValue

    return [
      styles.cell,
      col === 8 && styles.cellNoBorderRight,
      row === 8 && styles.cellNoBorderBottom,
      col % 3 === 2 && col !== 8 && styles.cellBorderRight,
      row % 3 === 2 && row !== 8 && styles.cellBorderBottom,
      isSelected && styles.cellSelected,
      !isSelected && (isSameRow || isSameCol || isSameBox) && styles.cellHighlight,
      isSameNumber && styles.cellSameNumber,
    ]
  }

  function getTextStyle(row: number, col: number) {
    const isPreFilled = board[row]?.[col] !== null
    const isWrong = wrongCells.has(`${row}-${col}`)
    const cellValue = current[row]?.[col] ?? null
    const isSameNumber =
      selectedValue !== null && cellValue === selectedValue &&
      !(selectedCell?.[0] === row && selectedCell?.[1] === col)
    return [
      styles.cellText,
      isPreFilled ? styles.textPreFilled : styles.textUserFilled,
      isWrong && styles.textWrong,
      isSameNumber && styles.textSameNumber,
    ]
  }

  return (
    <View style={styles.board}>
      {Array.from({ length: 9 }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: 9 }, (_, col) => {
            const value = current[row]?.[col] ?? null
            const cellNotes = notes[row]?.[col]
            const hasNotes = value === null && cellNotes && cellNotes.some((v, i) => i > 0 && v)

            return (
              <TouchableOpacity
                key={col}
                style={getCellStyle(row, col)}
                onPress={() => onSelectCell(row, col)}
                activeOpacity={0.7}
              >
                {value !== null ? (
                  <Text style={getTextStyle(row, col)}>{value}</Text>
                ) : hasNotes ? (
                  // 3×3 メモグリッド
                  <View style={styles.notesGrid}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <Text
                        key={n}
                        style={[styles.noteNum, !(cellNotes?.[n]) && styles.noteNumHidden]}
                      >
                        {n}
                      </Text>
                    ))}
                  </View>
                ) : null}
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
  cellNoBorderRight: {
    borderRightWidth: 0,
  },
  cellNoBorderBottom: {
    borderBottomWidth: 0,
  },
  cellSelected: {
    backgroundColor: '#b8d4f8',
  },
  cellHighlight: {
    backgroundColor: '#e8f1fb',
  },
  cellSameNumber: {
    backgroundColor: '#c5ddf7',
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
  textSameNumber: {
    fontWeight: 'bold',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: CELL_SIZE,
    height: CELL_SIZE,
    padding: 1,
  },
  noteNum: {
    width: NOTE_SIZE,
    height: NOTE_SIZE,
    fontSize: NOTE_SIZE * 0.65,
    textAlign: 'center',
    lineHeight: NOTE_SIZE,
    color: '#5c6bc0',
    fontWeight: '500',
  },
  noteNumHidden: {
    opacity: 0,
  },
})
