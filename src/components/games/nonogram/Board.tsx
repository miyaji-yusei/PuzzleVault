import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { NonogramState, CellState } from '../../../engines/nonogram/types'
import { NonogramMode, HintColor } from '../../../hooks/useNonogramGame'

const SCREEN_WIDTH = Dimensions.get('window').width
const MAX_BOARD = SCREEN_WIDTH - 32
const AXIS_THRESHOLD = 6

type Props = {
  state: NonogramState
  mode: NonogramMode
  autoCrossed: boolean[][]
  rowClueColors: HintColor[][]
  colClueColors: HintColor[][]
  onSetCell: (row: number, col: number) => void
  onSetCellTo: (row: number, col: number, target: CellState) => void
}

type PreviewRange = {
  axis: 'h' | 'v' | null
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  target: CellState
} | null

function isCellInPreview(row: number, col: number, p: PreviewRange): boolean {
  if (!p) return false
  if (p.axis === null) return row === p.startRow && col === p.startCol
  if (p.axis === 'h') {
    if (row !== p.startRow) return false
    const min = Math.min(p.startCol, p.endCol)
    const max = Math.max(p.startCol, p.endCol)
    return col >= min && col <= max
  }
  if (col !== p.startCol) return false
  const min = Math.min(p.startRow, p.endRow)
  const max = Math.max(p.startRow, p.endRow)
  return row >= min && row <= max
}

function listPreviewCells(p: PreviewRange): { row: number; col: number }[] {
  if (!p) return []
  if (p.axis === null) return [{ row: p.startRow, col: p.startCol }]
  const result: { row: number; col: number }[] = []
  if (p.axis === 'h') {
    const min = Math.min(p.startCol, p.endCol)
    const max = Math.max(p.startCol, p.endCol)
    for (let c = min; c <= max; c++) result.push({ row: p.startRow, col: c })
  } else {
    const min = Math.min(p.startRow, p.endRow)
    const max = Math.max(p.startRow, p.endRow)
    for (let r = min; r <= max; r++) result.push({ row: r, col: p.startCol })
  }
  return result
}

const HINT_COLOR: Record<HintColor, string> = {
  default: '#333',
  blue: '#1a7fd4',
  red: '#d93025',
}

export function NonogramBoard({ state, mode, autoCrossed, rowClueColors, colClueColors, onSetCell, onSetCellTo }: Props) {
  const { size, rowClues, colClues, current } = state

  const maxRowClues = Math.max(...rowClues.map(c => c.length))
  const maxColClues = Math.max(...colClues.map(c => c.length))

  const clueAreaWidth = maxRowClues * 18
  const clueAreaHeight = maxColClues * 16
  const cellSize = Math.min(Math.floor((MAX_BOARD - clueAreaWidth) / size), 28)

  const gridRef = useRef<View>(null)
  const gridPosRef = useRef({ x: 0, y: 0 })

  const measureGrid = useCallback(() => {
    gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      gridPosRef.current = { x: pageX, y: pageY }
    })
  }, [])

  useEffect(() => { measureGrid() }, [measureGrid])

  const onSetCellRef = useRef(onSetCell)
  const onSetCellToRef = useRef(onSetCellTo)
  onSetCellRef.current = onSetCell
  onSetCellToRef.current = onSetCellTo

  const currentRef = useRef(current)
  currentRef.current = current
  const modeRef = useRef(mode)
  modeRef.current = mode
  const sizeRef = useRef(size)
  sizeRef.current = size

  const paintTargetRef = useRef<CellState>('filled')
  const dragAxisRef = useRef<'h' | 'v' | null>(null)
  const dragStartRef = useRef({ row: 0, col: 0 })

  const [preview, setPreview] = useState<PreviewRange>(null)
  const previewRef = useRef<PreviewRange>(null)
  previewRef.current = preview

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => { gridPosRef.current = { x: pageX, y: pageY } })
      dragAxisRef.current = null

      const { pageX, pageY } = e.nativeEvent
      const startCol = Math.floor((pageX - gridPosRef.current.x) / cellSize)
      const startRow = Math.floor((pageY - gridPosRef.current.y) / cellSize)
      const sz = sizeRef.current

      if (startRow < 0 || startRow >= sz || startCol < 0 || startCol >= sz) {
        previewRef.current = null
        setPreview(null)
        return
      }

      dragStartRef.current = { row: startRow, col: startCol }

      const currentCellState = currentRef.current[startRow]?.[startCol] ?? 'empty'
      const targetFill: CellState = modeRef.current === 'fill' ? 'filled' : 'crossed'
      paintTargetRef.current = currentCellState === targetFill ? 'empty' : targetFill

      const p: PreviewRange = { axis: null, startRow, startCol, endRow: startRow, endCol: startCol, target: paintTargetRef.current }
      previewRef.current = p
      setPreview(p)
    },
    onPanResponderMove: (e, g) => {
      if (!previewRef.current) return

      if (dragAxisRef.current === null) {
        if (Math.abs(g.dx) > AXIS_THRESHOLD || Math.abs(g.dy) > AXIS_THRESHOLD) {
          dragAxisRef.current = Math.abs(g.dx) >= Math.abs(g.dy) ? 'h' : 'v'
        } else {
          return
        }
      }

      const start = dragStartRef.current
      const sz = sizeRef.current
      let p: PreviewRange
      if (dragAxisRef.current === 'h') {
        const col = Math.max(0, Math.min(sz - 1, Math.floor((e.nativeEvent.pageX - gridPosRef.current.x) / cellSize)))
        p = { axis: 'h', startRow: start.row, startCol: start.col, endRow: start.row, endCol: col, target: paintTargetRef.current }
      } else {
        const row = Math.max(0, Math.min(sz - 1, Math.floor((e.nativeEvent.pageY - gridPosRef.current.y) / cellSize)))
        p = { axis: 'v', startRow: start.row, startCol: start.col, endRow: row, endCol: start.col, target: paintTargetRef.current }
      }
      previewRef.current = p
      setPreview(p)
    },
    onPanResponderRelease: () => {
      const p = previewRef.current
      if (p) {
        const sz = sizeRef.current
        listPreviewCells(p).forEach(({ row, col }) => {
          if (row >= 0 && row < sz && col >= 0 && col < sz) {
            onSetCellToRef.current(row, col, p.target)
          }
        })
      }
      previewRef.current = null
      setPreview(null)
      dragAxisRef.current = null
    },
    onPanResponderTerminate: () => {
      previewRef.current = null
      setPreview(null)
      dragAxisRef.current = null
    },
  }), [cellSize])

  const gridWidth = cellSize * size
  const gridHeight = cellSize * size

  return (
    <View>
      {/* Column clues row */}
      <View style={styles.colCluesRow}>
        <View style={{ width: clueAreaWidth, height: clueAreaHeight }} />
        {Array.from({ length: size }, (_, col) => (
          <View key={col} style={[styles.clueCell, { width: cellSize, height: clueAreaHeight }]}>
            {colClues[col]?.map((n, i) => (
              <Text
                key={i}
                style={[styles.clueText, { color: HINT_COLOR[colClueColors[col]?.[i] ?? 'default'] }]}
              >
                {n === 0 ? '' : n}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Row clues + grid */}
      <View style={styles.gridRow}>
        {/* Row clues column */}
        <View>
          {Array.from({ length: size }, (_, row) => (
            <View key={row} style={[styles.rowClueCell, { width: clueAreaWidth, height: cellSize }]}>
              {rowClues[row]?.map((n, i) => (
                <Text
                  key={i}
                  style={[styles.clueText, { color: HINT_COLOR[rowClueColors[row]?.[i] ?? 'default'] }]}
                >
                  {n === 0 ? '' : n}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Cell grid with PanResponder */}
        <View
          ref={gridRef}
          onLayout={measureGrid}
          style={{ width: gridWidth, height: gridHeight }}
          {...panResponder.panHandlers}
        >
          {Array.from({ length: size }, (_, row) => (
            <View key={row} style={[styles.row, { height: cellSize }]}>
              {Array.from({ length: size }, (_, col) => {
                const cell = current[row]?.[col] ?? 'empty'
                const inPreview = isCellInPreview(row, col, preview)
                const isAutoX = autoCrossed[row]?.[col] ?? false
                const bg = inPreview
                  ? (preview!.target === 'filled' ? '#888'
                    : preview!.target === 'crossed' ? '#eee'
                    : cell === 'filled' ? '#bbb' : '#f5f5f5')
                  : (cell === 'filled' ? '#333' : '#fff')
                return (
                  <View
                    key={col}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize, backgroundColor: bg },
                      col % 5 === 4 && col !== size - 1 && styles.cellBorderRightThick,
                      row % 5 === 4 && row !== size - 1 && styles.cellBorderBottomThick,
                    ]}
                  >
                    {cell === 'crossed' && !inPreview && (
                      <Text style={[styles.crossText, { fontSize: cellSize * 0.6 }]}>×</Text>
                    )}
                    {cell === 'empty' && isAutoX && !inPreview && (
                      <Text style={[styles.crossText, styles.crossTextAuto, { fontSize: cellSize * 0.6 }]}>×</Text>
                    )}
                    {inPreview && preview!.target === 'crossed' && (
                      <Text style={[styles.crossText, styles.crossTextPreview, { fontSize: cellSize * 0.6 }]}>×</Text>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
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
    fontWeight: '500',
    lineHeight: 15,
  },
  gridRow: {
    flexDirection: 'row',
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
  crossTextAuto: {
    color: 'rgba(100, 160, 220, 0.6)',
  },
  crossTextPreview: {
    color: 'rgba(153, 153, 153, 0.5)',
  },
})
