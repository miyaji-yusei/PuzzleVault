import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions, Animated } from 'react-native'
import { NonogramState, CellState } from '../../../engines/nonogram/types'
import { NonogramMode, HintColor } from '../../../hooks/useNonogramGame'

const SCREEN_WIDTH = Dimensions.get('window').width
const MAX_BOARD = SCREEN_WIDTH - 32
const AXIS_THRESHOLD = 6
const MIN_SCALE = 1
const MAX_SCALE = 4

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

function touchDist(t1: { pageX: number; pageY: number }, t2: { pageX: number; pageY: number }) {
  return Math.sqrt((t1.pageX - t2.pageX) ** 2 + (t1.pageY - t2.pageY) ** 2)
}

export function NonogramBoard({ state, mode, autoCrossed, rowClueColors, colClueColors, onSetCell, onSetCellTo }: Props) {
  const { size, rowClues, colClues, current } = state

  const maxRowClues = Math.max(...rowClues.map(c => c.length))
  const maxColClues = Math.max(...colClues.map(c => c.length))

  const clueAreaWidth = maxRowClues * 18
  const clueAreaHeight = maxColClues * 16
  const cellSize = Math.min(Math.floor((MAX_BOARD - clueAreaWidth) / size), 28)
  const gridWidth = cellSize * size
  const gridHeight = cellSize * size
  const totalWidth = clueAreaWidth + gridWidth
  const totalHeight = clueAreaHeight + gridHeight

  // Touch area ref (outer fixed-position view)
  const touchAreaRef = useRef<View>(null)
  const touchAreaPosRef = useRef({ x: 0, y: 0 })

  const measureTouchArea = useCallback(() => {
    touchAreaRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      touchAreaPosRef.current = { x: pageX, y: pageY }
    })
  }, [])

  useEffect(() => { measureTouchArea() }, [measureTouchArea])

  // Scale and pan state
  const scaleRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)
  const scaleAnim = useRef(new Animated.Value(1)).current
  const panXAnim = useRef(new Animated.Value(0)).current
  const panYAnim = useRef(new Animated.Value(0)).current

  // 2-finger tracking
  const isTwoFingerRef = useRef(false)
  const pinchInitDistRef = useRef(0)
  const pinchInitScaleRef = useRef(1)
  const pinchInitPanXRef = useRef(0)
  const pinchInitPanYRef = useRef(0)
  const pinchInitMidXRef = useRef(0)
  const pinchInitMidYRef = useRef(0)
  // ピンチ終了後100ms間は塗り操作を無効化
  const lastPinchEndTimeRef = useRef(0)
  const PINCH_PAINT_BLOCK_MS = 100

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
  const cellSizeRef = useRef(cellSize)
  cellSizeRef.current = cellSize
  const clueAreaWidthRef = useRef(clueAreaWidth)
  clueAreaWidthRef.current = clueAreaWidth
  const clueAreaHeightRef = useRef(clueAreaHeight)
  clueAreaHeightRef.current = clueAreaHeight
  const totalWidthRef = useRef(totalWidth)
  totalWidthRef.current = totalWidth
  const totalHeightRef = useRef(totalHeight)
  totalHeightRef.current = totalHeight

  const paintTargetRef = useRef<CellState>('filled')
  const dragAxisRef = useRef<'h' | 'v' | null>(null)
  const dragStartRef = useRef({ row: 0, col: 0 })

  const [preview, setPreview] = useState<PreviewRange>(null)
  const previewRef = useRef<PreviewRange>(null)
  previewRef.current = preview

  // Compute grid cell from screen touch position, accounting for scale/pan transforms.
  // The full board (clues + grid) is inside the Animated.View, so we:
  // 1. Invert the transform to get position within the animated view
  // 2. Subtract clue area offsets to get position within the grid
  const getCellFromTouch = useCallback((pageX: number, pageY: number): { row: number; col: number } | null => {
    const areaX = touchAreaPosRef.current.x
    const areaY = touchAreaPosRef.current.y
    const W = totalWidthRef.current
    const H = totalHeightRef.current
    const s = scaleRef.current
    const tx = panXRef.current
    const ty = panYRef.current

    const relX = pageX - areaX
    const relY = pageY - areaY

    // Invert: visX = W/2*(1-s) + tx + localX*s
    const localX = (relX - W / 2 * (1 - s) - tx) / s
    const localY = (relY - H / 2 * (1 - s) - ty) / s

    // Grid starts after clue areas
    const gx = localX - clueAreaWidthRef.current
    const gy = localY - clueAreaHeightRef.current

    const col = Math.floor(gx / cellSizeRef.current)
    const row = Math.floor(gy / cellSizeRef.current)
    const sz = sizeRef.current

    if (row < 0 || row >= sz || col < 0 || col >= sz) return null
    return { row, col }
  }, [])

  const clampPan = useCallback((tx: number, ty: number, s: number) => {
    const W = totalWidthRef.current
    const H = totalHeightRef.current
    const maxX = W * (s - 1) / 2
    const maxY = H * (s - 1) / 2
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    }
  }, [])

  const initTwoFinger = useCallback((touches: { pageX: number; pageY: number }[]) => {
    const t1 = touches[0]!
    const t2 = touches[1]!
    pinchInitDistRef.current = touchDist(t1, t2)
    pinchInitScaleRef.current = scaleRef.current
    pinchInitPanXRef.current = panXRef.current
    pinchInitPanYRef.current = panYRef.current
    pinchInitMidXRef.current = (t1.pageX + t2.pageX) / 2
    pinchInitMidYRef.current = (t1.pageY + t2.pageY) / 2
  }, [])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (e) => {
      touchAreaRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
        touchAreaPosRef.current = { x: pageX, y: pageY }
      })
      const touches = e.nativeEvent.touches

      if (touches.length >= 2) {
        isTwoFingerRef.current = true
        initTwoFinger(Array.from(touches) as { pageX: number; pageY: number }[])
        return
      }

      // ピンチ操作直後は塗り操作を無効化
      if (Date.now() - lastPinchEndTimeRef.current < PINCH_PAINT_BLOCK_MS) {
        return
      }

      isTwoFingerRef.current = false
      dragAxisRef.current = null

      const { pageX, pageY } = e.nativeEvent
      const cell = getCellFromTouch(pageX, pageY)

      if (!cell) {
        previewRef.current = null
        setPreview(null)
        return
      }

      dragStartRef.current = { row: cell.row, col: cell.col }
      const currentCellState = currentRef.current[cell.row]?.[cell.col] ?? 'empty'
      const targetFill: CellState = modeRef.current === 'fill' ? 'filled' : 'crossed'
      paintTargetRef.current = currentCellState === targetFill ? 'empty' : targetFill

      const p: PreviewRange = { axis: null, startRow: cell.row, startCol: cell.col, endRow: cell.row, endCol: cell.col, target: paintTargetRef.current }
      previewRef.current = p
      setPreview(p)
    },

    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches

      if (touches.length >= 2) {
        if (!isTwoFingerRef.current) {
          // Second finger just added - switch to zoom mode, cancel paint
          isTwoFingerRef.current = true
          previewRef.current = null
          setPreview(null)
          initTwoFinger(Array.from(touches) as { pageX: number; pageY: number }[])
          return
        }

        const t1 = touches[0]!
        const t2 = touches[1]!
        const currentDist = touchDist(t1, t2)
        const rawScale = pinchInitScaleRef.current * (currentDist / pinchInitDistRef.current)
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, rawScale))

        const midX = (t1.pageX + t2.pageX) / 2
        const midY = (t1.pageY + t2.pageY) / 2
        const rawPanX = pinchInitPanXRef.current + (midX - pinchInitMidXRef.current)
        const rawPanY = pinchInitPanYRef.current + (midY - pinchInitMidYRef.current)
        const { x: newPanX, y: newPanY } = clampPan(rawPanX, rawPanY, newScale)

        scaleRef.current = newScale
        panXRef.current = newPanX
        panYRef.current = newPanY
        scaleAnim.setValue(newScale)
        panXAnim.setValue(newPanX)
        panYAnim.setValue(newPanY)
        return
      }

      if (isTwoFingerRef.current) return

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
        const cellFromTouch = getCellFromTouch(e.nativeEvent.pageX, e.nativeEvent.pageY)
        const col = cellFromTouch ? Math.max(0, Math.min(sz - 1, cellFromTouch.col)) : start.col
        p = { axis: 'h', startRow: start.row, startCol: start.col, endRow: start.row, endCol: col, target: paintTargetRef.current }
      } else {
        const cellFromTouch = getCellFromTouch(e.nativeEvent.pageX, e.nativeEvent.pageY)
        const row = cellFromTouch ? Math.max(0, Math.min(sz - 1, cellFromTouch.row)) : start.row
        p = { axis: 'v', startRow: start.row, startCol: start.col, endRow: row, endCol: start.col, target: paintTargetRef.current }
      }
      previewRef.current = p
      setPreview(p)
    },

    onPanResponderRelease: () => {
      if (!isTwoFingerRef.current) {
        const p = previewRef.current
        if (p) {
          const sz = sizeRef.current
          listPreviewCells(p).forEach(({ row, col }) => {
            if (row >= 0 && row < sz && col >= 0 && col < sz) {
              onSetCellToRef.current(row, col, p.target)
            }
          })
        }
      } else {
        lastPinchEndTimeRef.current = Date.now()
      }
      isTwoFingerRef.current = false
      previewRef.current = null
      setPreview(null)
      dragAxisRef.current = null
    },

    onPanResponderTerminate: () => {
      if (isTwoFingerRef.current) {
        lastPinchEndTimeRef.current = Date.now()
      }
      isTwoFingerRef.current = false
      previewRef.current = null
      setPreview(null)
      dragAxisRef.current = null
    },
  }), [cellSize, getCellFromTouch, clampPan, initTwoFinger])

  return (
    <View
      ref={touchAreaRef}
      onLayout={measureTouchArea}
      style={{ width: totalWidth, height: totalHeight, overflow: 'hidden' }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          width: totalWidth,
          height: totalHeight,
          transform: [
            { scale: scaleAnim },
            { translateX: panXAnim },
            { translateY: panYAnim },
          ],
        }}
      >
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

          {/* Grid cells */}
          <View>
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
      </Animated.View>
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
