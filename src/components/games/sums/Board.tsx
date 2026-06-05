import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { GridCell, BlackCell, SumsState } from '../../../engines/sums/types'

const SW = Dimensions.get('window').width

function getRunCells(grid: GridCell[][], row: number, col: number): Set<string> {
  const result = new Set<string>()
  const numRows = grid.length
  const numCols = grid[0]?.length ?? 0

  // 横ラン
  let startC = col
  while (startC > 0 && grid[row]?.[startC - 1]?.type === 'white') startC--
  let c = startC
  while (c < numCols && grid[row]?.[c]?.type === 'white') { result.add(`${row},${c}`); c++ }

  // 縦ラン
  let startR = row
  while (startR > 0 && grid[startR - 1]?.[col]?.type === 'white') startR--
  let r = startR
  while (r < numRows && grid[r]?.[col]?.type === 'white') { result.add(`${r},${col}`); r++ }

  return result
}

type Props = {
  state: SumsState
  selectedCell: [number, number] | null
  wrongCells: Set<string>
  onSelectCell: (row: number, col: number) => void
}

export function SumsBoard({ state, selectedCell, wrongCells, onSelectCell }: Props) {
  const { grid, current, size } = state
  const cellSize = Math.floor((SW - 16) / size)
  const clueFontSize = Math.max(7, Math.floor(cellSize * 0.3))
  const valueFontSize = Math.max(10, Math.floor(cellSize * 0.48))

  const runCells = useMemo(() => {
    if (!selectedCell) return new Set<string>()
    return getRunCells(grid, selectedCell[0], selectedCell[1])
  }, [grid, selectedCell])

  return (
    <View style={[styles.grid, { width: cellSize * size, height: cellSize * size }]}>
      {grid.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((cell, ci) => {
            if (cell.type === 'black') {
              const bc = cell as BlackCell
              return (
                <View
                  key={ci}
                  style={[styles.blackCell, { width: cellSize, height: cellSize }]}
                >
                  {/* 斜め分割線 */}
                  <View style={[styles.diagonal, {
                    width: cellSize * 1.42,
                    top: cellSize / 2 - 0.5,
                    left: -(cellSize * 0.21),
                  }]} />
                  {/* 右ラン合計（右上） */}
                  {bc.sumRight !== undefined && (
                    <Text
                      style={[styles.clueText, { fontSize: clueFontSize, position: 'absolute', top: 1, right: 2 }]}
                      numberOfLines={1}
                    >
                      {bc.sumRight}
                    </Text>
                  )}
                  {/* 下ラン合計（左下） */}
                  {bc.sumDown !== undefined && (
                    <Text
                      style={[styles.clueText, { fontSize: clueFontSize, position: 'absolute', bottom: 1, left: 2 }]}
                      numberOfLines={1}
                    >
                      {bc.sumDown}
                    </Text>
                  )}
                </View>
              )
            }

            const cellKey = `${ri}-${ci}`
            const isSelected = selectedCell?.[0] === ri && selectedCell?.[1] === ci
            const isInRun = runCells.has(`${ri},${ci}`) && !isSelected
            const isWrong = wrongCells.has(cellKey)
            const value = current[ri]?.[ci] ?? null

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.whiteCell,
                  { width: cellSize, height: cellSize },
                  isSelected && styles.cellSelected,
                  isInRun && styles.cellHighlight,
                  isWrong && styles.cellWrong,
                ]}
                onPress={() => onSelectCell(ri, ci)}
                activeOpacity={0.7}
              >
                {value !== null && (
                  <Text style={[
                    styles.valueText,
                    { fontSize: valueFontSize },
                    isWrong && styles.valueWrong,
                  ]}>
                    {value}
                  </Text>
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
  grid: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#555',
  },
  row: {
    flexDirection: 'row',
  },
  blackCell: {
    backgroundColor: '#2c2c2c',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#555',
    overflow: 'hidden',
  },
  diagonal: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#888',
    transform: [{ rotate: '45deg' }],
  },
  clueText: {
    color: '#fff',
    fontWeight: '600',
  },
  whiteCell: {
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#aaa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: '#ffd54f',
  },
  cellHighlight: {
    backgroundColor: '#fff9c4',
  },
  cellWrong: {
    backgroundColor: '#ffebee',
  },
  valueText: {
    fontWeight: '600',
    color: '#1565c0',
  },
  valueWrong: {
    color: '#c62828',
  },
})
