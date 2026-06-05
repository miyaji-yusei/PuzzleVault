import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { Island, Bridge, HashiState } from '../../../engines/hashi/types'

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = 16

type Props = {
  state: HashiState
  onToggleBridge: (fromId: number, toId: number) => void
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
    const dist = Math.sqrt((row - island.row) ** 2 + (col - island.col) ** 2)
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
  tapCol: number
): [number, number] | null {
  let bestPair: [number, number] | null = null
  let bestDist = Infinity

  for (const [aId, bId] of pairs) {
    const a = islandMap.get(aId)
    const b = islandMap.get(bId)
    if (!a || !b) continue

    if (a.row === b.row) {
      const minCol = Math.min(a.col, b.col)
      const maxCol = Math.max(a.col, b.col)
      if (tapCol > minCol && tapCol < maxCol) {
        const dist = Math.abs(tapRow - a.row)
        if (dist < bestDist) {
          bestDist = dist
          bestPair = [aId, bId]
        }
      }
    } else if (a.col === b.col) {
      const minRow = Math.min(a.row, b.row)
      const maxRow = Math.max(a.row, b.row)
      if (tapRow > minRow && tapRow < maxRow) {
        const dist = Math.abs(tapCol - a.col)
        if (dist < bestDist) {
          bestDist = dist
          bestPair = [aId, bId]
        }
      }
    }
  }

  return bestPair
}

function getIslandCurrentBridges(islandId: number, current: Bridge[]): number {
  return current.reduce((sum, b) => {
    if (b.from === islandId || b.to === islandId) return sum + b.count
    return sum
  }, 0)
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

  const gridRef = useRef<View>(null)
  const gridPosRef = useRef({ x: 0, y: 0 })
  const dragStartIslandIdRef = useRef<number | null>(null)

  const measureGrid = useCallback(() => {
    gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      gridPosRef.current = { x: pageX, y: pageY }
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

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
        gridPosRef.current = { x: pageX, y: pageY }
      })
      const { pageX, pageY } = e.nativeEvent
      const relX = pageX - gridPosRef.current.x
      const relY = pageY - gridPosRef.current.y
      const cs = cellSizeRef.current
      const tapCol = relX / cs
      const tapRow = relY / cs
      const radiusCells = Math.max(10, Math.floor(cs * 0.38)) / cs
      const islandAt = findIslandAt(islandsRef.current, tapRow, tapCol, radiusCells + 0.1)
      dragStartIslandIdRef.current = islandAt ? islandAt.id : null
    },
    onPanResponderRelease: (e) => {
      const { pageX, pageY } = e.nativeEvent
      const relX = pageX - gridPosRef.current.x
      const relY = pageY - gridPosRef.current.y
      const cs = cellSizeRef.current

      const tapCol = relX / cs
      const tapRow = relY / cs
      const radiusCells = Math.max(10, Math.floor(cs * 0.38)) / cs

      const startIslandId = dragStartIslandIdRef.current
      dragStartIslandIdRef.current = null

      if (startIslandId !== null) {
        // Drag started from an island — find target island
        const endIsland = findIslandAt(islandsRef.current, tapRow, tapCol, radiusCells + 0.1)
        if (endIsland && endIsland.id !== startIslandId) {
          // Check they are in the adjacent pairs
          const pair = pairsRef.current.find(
            ([a, b]) => (a === startIslandId && b === endIsland.id) ||
                        (a === endIsland.id && b === startIslandId)
          )
          if (pair) {
            onToggleBridgeRef.current(pair[0], pair[1])
          }
        }
        // Single tap on island → no action
        return
      }

      // No island at start — use existing tap-between logic
      const pair = findTappedBridge(pairsRef.current, islandMapRef.current, tapRow, tapCol)
      if (pair) {
        onToggleBridgeRef.current(pair[0], pair[1])
      }
    },
  }), [])

  return (
    <View
      ref={gridRef}
      onLayout={measureGrid}
      style={{ width: gridWidth, height: gridHeight, backgroundColor: '#f8f8f8' }}
      {...panResponder.panHandlers}
    >
      {/* Grid lines */}
      {Array.from({ length: gridSize + 1 }, (_, i) => (
        <View key={`hl-${i}`} style={{ position: 'absolute', left: 0, top: i * cellSize, width: gridWidth, height: StyleSheet.hairlineWidth, backgroundColor: '#ccc' }} />
      ))}
      {Array.from({ length: gridSize + 1 }, (_, i) => (
        <View key={`vl-${i}`} style={{ position: 'absolute', top: 0, left: i * cellSize, height: gridHeight, width: StyleSheet.hairlineWidth, backgroundColor: '#ccc' }} />
      ))}
      {/* Bridges */}
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

      {/* Islands */}
      {islands.map(island => {
        const currentCount = getIslandCurrentBridges(island.id, current)
        const isSatisfied = currentCount === island.bridges

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
              backgroundColor: isSatisfied ? '#c8e6c9' : '#fff',
              borderColor: isSatisfied ? '#4caf50' : '#444',
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
    backgroundColor: '#555',
  },
  island: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandText: {
    fontWeight: 'bold',
    color: '#333',
  },
})
