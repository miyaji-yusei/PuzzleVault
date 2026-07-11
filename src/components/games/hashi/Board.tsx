import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { Island, Bridge, HashiState } from '../../../engines/hashi/types'
import { measurePageOrigin, boardTouchFixStyle } from '../../../utils/boardCoords'

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = 16
const BRIDGE_TAP_THRESHOLD = 0.45
const DRAG_CONFIRM_THRESHOLD = 0.7

type Props = {
  state: HashiState
  onToggleBridge: (fromId: number, toId: number) => void
}

type DragLine = {
  x1: number; y1: number
  x2: number; y2: number
  isHoriz: boolean
}

function getAdjacentPairs(islands: Island[]): [number, number][] {
  const pairs: [number, number][] = []
  const byRow = new Map<number, Island[]>()
  const byCol = new Map<number, Island[]>()

  for (const island of islands) {
    if (!byRow.has(island.row)) byRow.set(island.row, [])
    byRow.get(island.row)!.push(island)
    if (!byCol.has(island.col)) byCol.set(island.col, [])
    byCol.get(island.col)!.push(island)
  }

  for (const rowIslands of byRow.values()) {
    const sorted = [...rowIslands].sort((a, b) => a.col - b.col)
    for (let i = 0; i < sorted.length - 1; i++) {
      pairs.push([sorted[i].id, sorted[i + 1].id])
    }
  }

  for (const colIslands of byCol.values()) {
    const sorted = [...colIslands].sort((a, b) => a.row - b.row)
    for (let i = 0; i < sorted.length - 1; i++) {
      pairs.push([sorted[i].id, sorted[i + 1].id])
    }
  }

  return pairs
}

function findIslandAt(islands: Island[], row: number, col: number, radiusCells: number): Island | null {
  let best: Island | null = null
  let bestDist = Infinity
  for (const island of islands) {
    const dist = Math.sqrt((row - (island.row + 0.5)) ** 2 + (col - (island.col + 0.5)) ** 2)
    if (dist <= radiusCells && dist < bestDist) {
      bestDist = dist
      best = island
    }
  }
  return best
}

function findTappedBridge(
  pairs: [number, number][],
  islandMap: Map<number, Island>,
  tapRow: number,
  tapCol: number,
  current: Bridge[]
): [number, number] | null {
  let bestHorizPair: [number, number] | null = null
  let bestHorizDist = Infinity
  let bestVertPair: [number, number] | null = null
  let bestVertDist = Infinity

  for (const [aId, bId] of pairs) {
    const a = islandMap.get(aId)
    const b = islandMap.get(bId)
    if (!a || !b) continue

    if (a.row === b.row) {
      const minCol = Math.min(a.col, b.col)
      const maxCol = Math.max(a.col, b.col)
      if (tapCol > minCol && tapCol < maxCol) {
        const dist = Math.abs(tapRow - (a.row + 0.5))
        if (dist < BRIDGE_TAP_THRESHOLD && dist < bestHorizDist) {
          bestHorizDist = dist
          bestHorizPair = [aId, bId]
        }
      }
    } else if (a.col === b.col) {
      const minRow = Math.min(a.row, b.row)
      const maxRow = Math.max(a.row, b.row)
      if (tapRow > minRow && tapRow < maxRow) {
        const dist = Math.abs(tapCol - (a.col + 0.5))
        if (dist < BRIDGE_TAP_THRESHOLD && dist < bestVertDist) {
          bestVertDist = dist
          bestVertPair = [aId, bId]
        }
      }
    }
  }

  // Ambiguous: tap is near both a horizontal and a vertical bridge
  // Prefer the direction that already has a drawn bridge (allows removal)
  if (bestHorizPair && bestVertPair) {
    const horizDrawn = current.some(
      b => (b.from === bestHorizPair![0] && b.to === bestHorizPair![1]) ||
           (b.from === bestHorizPair![1] && b.to === bestHorizPair![0])
    )
    const vertDrawn = current.some(
      b => (b.from === bestVertPair![0] && b.to === bestVertPair![1]) ||
           (b.from === bestVertPair![1] && b.to === bestVertPair![0])
    )
    if (horizDrawn && !vertDrawn) return bestHorizPair
    if (vertDrawn && !horizDrawn) return bestVertPair
    return null
  }

  return bestHorizPair ?? bestVertPair
}

function getIslandCurrentBridges(islandId: number, current: Bridge[]): number {
  return current.reduce((sum, b) => {
    if (b.from === islandId || b.to === islandId) return sum + b.count
    return sum
  }, 0)
}

function isIslandSatisfied(island: Island, current: Bridge[]): boolean {
  return getIslandCurrentBridges(island.id, current) === island.bridges
}

function computeDragToTarget(
  startIsland: Island,
  pairs: [number, number][],
  islandMap: Map<number, Island>,
  fingerRow: number,
  fingerCol: number,
  cs: number,
  current: Bridge[]
): { pair: [number, number]; progress: number; line: DragLine } | null {
  const dRow = fingerRow - (startIsland.row + 0.5)
  const dCol = fingerCol - (startIsland.col + 0.5)
  const horizontal = Math.abs(dCol) >= Math.abs(dRow)

  let bestPair: [number, number] | null = null
  let bestProgress = 0
  let bestTarget: Island | null = null

  for (const [aId, bId] of pairs) {
    const sameStart = aId === startIsland.id || bId === startIsland.id
    if (!sameStart) continue
    const candidateId = aId === startIsland.id ? bId : aId
    const candidate = islandMap.get(candidateId)
    if (!candidate) continue
    // 接続先の島が既に完成済み(緑)の場合、橋の変更でその完成状態が崩れてしまうため対象外にする
    if (isIslandSatisfied(candidate, current)) continue

    if (horizontal && candidate.row === startIsland.row) {
      const dir = candidate.col > startIsland.col ? 1 : -1
      if (Math.sign(dCol) !== dir) continue
      const total = Math.abs(candidate.col - startIsland.col)
      const progress = Math.min(1, Math.abs(dCol) / total)
      if (progress > bestProgress) {
        bestProgress = progress
        bestPair = [aId, bId]
        bestTarget = candidate
      }
    } else if (!horizontal && candidate.col === startIsland.col) {
      const dir = candidate.row > startIsland.row ? 1 : -1
      if (Math.sign(dRow) !== dir) continue
      const total = Math.abs(candidate.row - startIsland.row)
      const progress = Math.min(1, Math.abs(dRow) / total)
      if (progress > bestProgress) {
        bestProgress = progress
        bestPair = [aId, bId]
        bestTarget = candidate
      }
    }
  }

  if (!bestPair || !bestTarget) return null

  const islandRadius = Math.max(10, Math.floor(cs * 0.38))
  const x1 = startIsland.col * cs + cs / 2
  const y1 = startIsland.row * cs + cs / 2

  let x2: number, y2: number
  if (horizontal) {
    const dir = bestTarget.col > startIsland.col ? 1 : -1
    const maxReach = bestTarget.col * cs + cs / 2
    x2 = dir > 0
      ? Math.min(maxReach, x1 + Math.abs(dCol) * cs)
      : Math.max(maxReach, x1 - Math.abs(dCol) * cs)
    y2 = y1
  } else {
    const dir = bestTarget.row > startIsland.row ? 1 : -1
    const maxReach = bestTarget.row * cs + cs / 2
    y2 = dir > 0
      ? Math.min(maxReach, y1 + Math.abs(dRow) * cs)
      : Math.max(maxReach, y1 - Math.abs(dRow) * cs)
    x2 = x1
  }

  // Don't render line shorter than the island radius (nothing visible yet)
  const lineLen = Math.abs(horizontal ? x2 - x1 : y2 - y1)
  if (lineLen <= islandRadius) return null

  return { pair: bestPair, progress: bestProgress, line: { x1, y1, x2, y2, isHoriz: horizontal } }
}

export function HashiBoard({ state, onToggleBridge }: Props) {
  const { gridSize, islands, current } = state

  const cellSize = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2) / gridSize)
  const islandRadius = Math.max(10, Math.floor(cellSize * 0.38))
  const gridWidth = cellSize * gridSize
  const gridHeight = cellSize * gridSize

  const islandMap = useMemo(
    () => new Map(islands.map(i => [i.id, i])),
    [islands]
  )

  const pairs = useMemo(() => getAdjacentPairs(islands), [islands])

  const [dragLine, setDragLine] = useState<DragLine | null>(null)
  const setDragLineRef = useRef(setDragLine)
  setDragLineRef.current = setDragLine

  const gridRef = useRef<View>(null)
  const gridPosRef = useRef({ x: 0, y: 0 })
  const dragStartIslandIdRef = useRef<number | null>(null)
  const dragStartSatisfiedRef = useRef(false)
  const tapStartBridgeRef = useRef<[number, number] | null>(null)

  const measureGrid = useCallback(() => {
    requestAnimationFrame(() => {
      measurePageOrigin(gridRef.current, (origin) => {
        gridPosRef.current = origin
      })
    })
  }, [])

  useEffect(() => { measureGrid() }, [measureGrid])

  const onToggleBridgeRef = useRef(onToggleBridge)
  onToggleBridgeRef.current = onToggleBridge

  const cellSizeRef = useRef(cellSize)
  cellSizeRef.current = cellSize
  const pairsRef = useRef(pairs)
  pairsRef.current = pairs
  const islandMapRef = useRef(islandMap)
  islandMapRef.current = islandMap
  const islandsRef = useRef(islands)
  islandsRef.current = islands
  const currentRef = useRef(current)
  currentRef.current = current

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      // スクロール/リサイズ後でも原点が最新になるよう都度測定（webでは同期）
      measurePageOrigin(gridRef.current, (origin) => {
        gridPosRef.current = origin
      })
      const { pageX, pageY } = e.nativeEvent
      const relX = pageX - gridPosRef.current.x
      const relY = pageY - gridPosRef.current.y
      const cs = cellSizeRef.current
      const tapCol = relX / cs
      const tapRow = relY / cs
      const radiusCells = Math.max(10, Math.floor(cs * 0.38)) / cs
      const islandAt = findIslandAt(islandsRef.current, tapRow, tapCol, radiusCells + 0.1)
      if (islandAt) {
        const bridgeCount = getIslandCurrentBridges(islandAt.id, currentRef.current)
        dragStartSatisfiedRef.current = bridgeCount >= islandAt.bridges
        dragStartIslandIdRef.current = islandAt.id
        tapStartBridgeRef.current = null
      } else {
        dragStartSatisfiedRef.current = false
        dragStartIslandIdRef.current = null
        tapStartBridgeRef.current = findTappedBridge(pairsRef.current, islandMapRef.current, tapRow, tapCol, currentRef.current)
      }
    },
    onPanResponderMove: (e) => {
      const startIslandId = dragStartIslandIdRef.current
      if (startIslandId === null || dragStartSatisfiedRef.current) return

      const { pageX, pageY } = e.nativeEvent
      const cs = cellSizeRef.current
      const fingerCol = (pageX - gridPosRef.current.x) / cs
      const fingerRow = (pageY - gridPosRef.current.y) / cs

      const startIsland = islandMapRef.current.get(startIslandId)
      if (!startIsland) return

      const result = computeDragToTarget(
        startIsland, pairsRef.current, islandMapRef.current, fingerRow, fingerCol, cs, currentRef.current
      )
      setDragLineRef.current(result ? result.line : null)
    },
    onPanResponderRelease: (e, g) => {
      const { pageX, pageY } = e.nativeEvent
      const relX = pageX - gridPosRef.current.x
      const relY = pageY - gridPosRef.current.y
      const cs = cellSizeRef.current
      const tapCol = relX / cs
      const tapRow = relY / cs
      const isDrag = Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8

      const startIslandId = dragStartIslandIdRef.current
      const startSatisfied = dragStartSatisfiedRef.current
      const startBridge = tapStartBridgeRef.current
      dragStartIslandIdRef.current = null
      dragStartSatisfiedRef.current = false
      tapStartBridgeRef.current = null
      setDragLineRef.current(null)

      if (startIslandId !== null) {
        if (!startSatisfied && isDrag) {
          const startIsland = islandsRef.current.find(i => i.id === startIslandId)
          if (startIsland) {
            const result = computeDragToTarget(
              startIsland, pairsRef.current, islandMapRef.current, tapRow, tapCol, cs, currentRef.current
            )
            // Confirm bridge only if finger reached 90%+ of the way to the target island
            if (result && result.progress >= DRAG_CONFIRM_THRESHOLD) {
              onToggleBridgeRef.current(result.pair[0], result.pair[1])
            }
          }
        }
        // Single tap on island or drag from satisfied island or insufficient drag → no action
        return
      }

      // Only toggle bridge if touch both started AND ended near the same bridge line
      if (!isDrag && startBridge) {
        const endBridge = findTappedBridge(pairsRef.current, islandMapRef.current, tapRow, tapCol, currentRef.current)
        if (endBridge && endBridge[0] === startBridge[0] && endBridge[1] === startBridge[1]) {
          // 橋の両端の島がどちらも完成済み(緑)の場合は、橋の本数を変更すると
          // その完成状態が崩れてしまうためトグル操作を無効化する
          const islandA = islandMapRef.current.get(endBridge[0])
          const islandB = islandMapRef.current.get(endBridge[1])
          const bothSatisfied =
            !!islandA && !!islandB &&
            isIslandSatisfied(islandA, currentRef.current) &&
            isIslandSatisfied(islandB, currentRef.current)
          if (!bothSatisfied) onToggleBridgeRef.current(startBridge[0], startBridge[1])
        }
      }
    },
  }), [])

  // Render drag preview line dimensions
  const previewLineViews = useMemo(() => {
    if (!dragLine) return null
    const { x1, y1, x2, y2, isHoriz } = dragLine
    if (isHoriz) {
      const left = Math.min(x1, x2) + islandRadius
      const width = Math.max(0, Math.abs(x2 - x1) - islandRadius)
      return <View style={[styles.previewLine, { left, top: y1 - 1, width, height: 2 }]} />
    } else {
      const top = Math.min(y1, y2) + islandRadius
      const height = Math.max(0, Math.abs(y2 - y1) - islandRadius)
      return <View style={[styles.previewLine, { left: x1 - 1, top, width: 2, height }]} />
    }
  }, [dragLine, islandRadius])

  return (
    <View
      ref={gridRef}
      onLayout={measureGrid}
      style={[{ width: gridWidth, height: gridHeight, backgroundColor: '#17181B' }, boardTouchFixStyle]}
      {...panResponder.panHandlers}
    >
      {/* Grid lines */}
      {Array.from({ length: gridSize + 1 }, (_, i) => (
        <View key={`hl-${i}`} style={{ position: 'absolute', left: 0, top: i * cellSize, width: gridWidth, height: StyleSheet.hairlineWidth, backgroundColor: '#2E3036' }} />
      ))}
      {Array.from({ length: gridSize + 1 }, (_, i) => (
        <View key={`vl-${i}`} style={{ position: 'absolute', top: 0, left: i * cellSize, height: gridHeight, width: StyleSheet.hairlineWidth, backgroundColor: '#2E3036' }} />
      ))}
      {/* Confirmed bridges */}
      {current.map(bridge => {
        const a = islandMap.get(bridge.from)
        const b = islandMap.get(bridge.to)
        if (!a || !b) return null

        const isHorizontal = a.row === b.row
        const key = `${bridge.from}-${bridge.to}`

        if (isHorizontal) {
          const minCol = Math.min(a.col, b.col)
          const maxCol = Math.max(a.col, b.col)
          const left = minCol * cellSize + cellSize / 2 + islandRadius
          const width = Math.max(0, (maxCol - minCol) * cellSize - islandRadius * 2)
          const centerY = a.row * cellSize + cellSize / 2

          if (bridge.count === 1) {
            return (
              <View key={key} style={[styles.bridge, { left, top: centerY - 1, width, height: 2 }]} />
            )
          }
          return (
            <React.Fragment key={key}>
              <View style={[styles.bridge, { left, top: centerY - 4, width, height: 2 }]} />
              <View style={[styles.bridge, { left, top: centerY + 2, width, height: 2 }]} />
            </React.Fragment>
          )
        } else {
          const minRow = Math.min(a.row, b.row)
          const maxRow = Math.max(a.row, b.row)
          const top = minRow * cellSize + cellSize / 2 + islandRadius
          const height = Math.max(0, (maxRow - minRow) * cellSize - islandRadius * 2)
          const centerX = a.col * cellSize + cellSize / 2

          if (bridge.count === 1) {
            return (
              <View key={key} style={[styles.bridge, { left: centerX - 1, top, width: 2, height }]} />
            )
          }
          return (
            <React.Fragment key={key}>
              <View style={[styles.bridge, { left: centerX - 4, top, width: 2, height }]} />
              <View style={[styles.bridge, { left: centerX + 2, top, width: 2, height }]} />
            </React.Fragment>
          )
        }
      })}

      {/* Drag preview line */}
      {previewLineViews}

      {/* Islands */}
      {islands.map(island => {
        const isSatisfied = isIslandSatisfied(island, current)

        const left = island.col * cellSize + cellSize / 2 - islandRadius
        const top = island.row * cellSize + cellSize / 2 - islandRadius
        const diameter = islandRadius * 2

        return (
          <View
            key={island.id}
            style={[styles.island, {
              left,
              top,
              width: diameter,
              height: diameter,
              borderRadius: islandRadius,
              backgroundColor: isSatisfied ? 'rgba(47, 168, 118, 0.22)' : '#232428',
              borderColor: isSatisfied ? '#2FA876' : '#C9C7BD',
            }]}
          >
            <Text style={[styles.islandText, { fontSize: Math.max(10, Math.floor(islandRadius * 0.85)) }]}>
              {island.bridges}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bridge: {
    position: 'absolute',
    backgroundColor: '#FFD230',
  },
  previewLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 210, 48, 0.6)',
    opacity: 0.8,
  },
  island: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandText: {
    fontWeight: 'bold',
    color: '#F5F4EF',
  },
})
