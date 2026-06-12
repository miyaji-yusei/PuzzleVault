import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { SumsState, CellMark, ColorGroup } from '../../../engines/sums/types'

const SW = Dimensions.get('window').width
const GROUP_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFB347', '#A29BFE', '#6C5CE7', '#FD79A8', '#00B894']
const GROUP_COLORS_LIGHT = ['#FFE5E5', '#E0F8F5', '#E0F4FF', '#FFF4E0', '#EEE8FF', '#E8E4FF', '#FFE5F2', '#E0FFF5']

function getGroupForCell(colorGroups: ColorGroup[], r: number, c: number): ColorGroup | undefined {
  return colorGroups.find(g => g.cells.some(([gr, gc]) => gr === r && gc === c))
}

// 各グループの一番左上のセル（最小row→最小col）の座標キー("r,c") -> グループ を返す
function buildGroupTopLeftMap(colorGroups: ColorGroup[]): Map<string, ColorGroup> {
  const map = new Map<string, ColorGroup>()
  for (const group of colorGroups) {
    const [tr, tc] = group.cells.reduce((min, cell) =>
      (cell[0] < min[0] || (cell[0] === min[0] && cell[1] < min[1])) ? cell : min
    )
    map.set(`${tr},${tc}`, group)
  }
  return map
}

function isRowComplete(state: SumsState, row: number): boolean {
  return state.current[row]!.every(m => m !== null) &&
    state.current[row]!.reduce((s, m, j) =>
      s + (m === 'circle' ? state.grid[row]![j]! : 0), 0
    ) === state.rowSums[row]
}

function isColComplete(state: SumsState, col: number): boolean {
  return state.current.every(r => r[col] !== null) &&
    state.current.reduce((s, row, i) =>
      s + (row[col] === 'circle' ? state.grid[i]![col]! : 0), 0
    ) === state.colSums[col]
}

function isGroupComplete(state: SumsState, group: ColorGroup): boolean {
  return group.cells.every(([r, c]) => state.current[r]?.[c] !== null) &&
    group.cells.reduce((s, [r, c]) =>
      s + (state.current[r]?.[c] === 'circle' ? state.grid[r]![c]! : 0), 0
    ) === group.targetSum
}

function getRowLiveSum(state: SumsState, row: number): number {
  return state.current[row]!.reduce((s, m, j) =>
    s + (m === 'circle' ? state.grid[row]![j]! : 0), 0
  )
}

function getColLiveSum(state: SumsState, col: number): number {
  return state.current.reduce((s, row, i) =>
    s + (row[col] === 'circle' ? state.grid[i]![col]! : 0), 0
  )
}

type Props = {
  state: SumsState
  flashCells: Set<string>
  onTapCell: (row: number, col: number) => void
}

export function SumsBoard({ state, flashCells, onTapCell }: Props) {
  const { grid, current, rowSums, colSums, colorGroups } = state
  const headerSize = 32
  const cellSize = Math.floor((SW - 16 - headerSize) / 5)

  const rowComplete = useMemo(
    () => Array.from({ length: 5 }, (_, i) => isRowComplete(state, i)),
    [state]
  )
  const colComplete = useMemo(
    () => Array.from({ length: 5 }, (_, j) => isColComplete(state, j)),
    [state]
  )
  const rowLiveSums = useMemo(
    () => Array.from({ length: 5 }, (_, i) => getRowLiveSum(state, i)),
    [state]
  )
  const colLiveSums = useMemo(
    () => Array.from({ length: 5 }, (_, j) => getColLiveSum(state, j)),
    [state]
  )
  const groupComplete = useMemo(
    () => colorGroups.map(g => isGroupComplete(state, g)),
    [state, colorGroups]
  )
  const groupTopLeftMap = useMemo(
    () => buildGroupTopLeftMap(colorGroups),
    [colorGroups]
  )

  return (
    <View>
      {/* Column sum headers */}
      <View style={styles.headerRow}>
        <View style={{ width: headerSize }} />
        {Array.from({ length: 5 }, (_, j) => (
          <View key={j} style={[styles.sumHeader, { width: cellSize, height: headerSize }]}>
            <Text style={styles.sumText}>
              {colComplete[j] ? '' : (
                <>
                  <Text style={styles.liveSumText}>{colLiveSums[j]}</Text>
                  /{colSums[j]}
                </>
              )}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid rows */}
      {grid.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {/* Row sum header */}
          <View style={[styles.sumHeader, { width: headerSize, height: cellSize }]}>
            <Text style={styles.sumText}>
              {rowComplete[ri] ? '' : (
                <>
                  <Text style={styles.liveSumText}>{rowLiveSums[ri]}</Text>
                  /{rowSums[ri]}
                </>
              )}
            </Text>
          </View>

          {row.map((val, ci) => {
            const group = getGroupForCell(colorGroups, ri, ci)
            const gIdx = group?.colorIndex ?? 0
            const gDone = group ? groupComplete[group.id] ?? false : false
            const mark: CellMark = current[ri]?.[ci] ?? null
            const isFlash = flashCells.has(`${ri},${ci}`)

            const rowDone = rowComplete[ri] ?? false
            const colDone = colComplete[ci] ?? false
            const showDim = gDone && mark === 'cross'
            const topLeftGroup = groupTopLeftMap.get(`${ri},${ci}`)

            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  { backgroundColor: gDone ? '#fff' : GROUP_COLORS_LIGHT[gIdx % GROUP_COLORS_LIGHT.length] },
                  { borderColor: GROUP_COLORS[gIdx % GROUP_COLORS.length] },
                  isFlash && styles.cellFlash,
                ]}
                onPress={() => onTapCell(ri, ci)}
                activeOpacity={0.7}
              >
                {/* グループ合計値（左上セルの左上隅に表示） */}
                {topLeftGroup && (
                  <Text style={[styles.groupSumLabel, gDone && styles.sumDone]}>
                    {topLeftGroup.targetSum}
                  </Text>
                )}

                {/* Number (hidden if cross in complete group) */}
                {!showDim && (
                  <Text style={[
                    styles.cellNum,
                    { fontSize: Math.max(10, Math.floor(cellSize * 0.38)) },
                    (rowDone && colDone) && styles.cellNumDone,
                  ]}>
                    {val}
                  </Text>
                )}

                {/* Mark overlay */}
                {mark === 'cross' && !gDone && (
                  <View style={[StyleSheet.absoluteFillObject, styles.markOverlay]}>
                    <Text style={[styles.markText, { fontSize: Math.max(14, Math.floor(cellSize * 0.7)) }]}>×</Text>
                  </View>
                )}
                {mark === 'circle' && (
                  <View style={[StyleSheet.absoluteFillObject, styles.markOverlayCircle]}>
                    <Text style={[styles.markTextCircle, { fontSize: Math.max(14, Math.floor(cellSize * 0.7)) }]}>○</Text>
                  </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sumHeader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sumDone: {
    color: '#bbb',
  },
  liveSumText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#ADB8E8',
  },
  cell: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellFlash: {
    backgroundColor: '#FFCDD2',
  },
  cellNum: {
    fontWeight: '600',
    color: '#333',
  },
  cellNumDone: {
    color: '#bbb',
  },
  markOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,0,0,0.08)',
  },
  markOverlayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,120,0,0.08)',
  },
  markText: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  markTextCircle: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  groupSumLabel: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontSize: 9,
    fontWeight: '700',
    color: '#555',
    zIndex: 1,
  },
})
