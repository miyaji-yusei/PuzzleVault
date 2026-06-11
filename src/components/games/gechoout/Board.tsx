import React, { useCallback, useMemo, useRef } from 'react'
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native'
import { DIRECTION_DELTA } from '../../../engines/gechoout'
import { Direction, GechoOutState, SnakeEnd } from '../../../engines/gechoout/types'
import { MoveResult } from '../../../hooks/useGechooutGame'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

const SNAKE_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b']

const DRAG_THRESHOLD_RATIO = 0.5

type Props = {
  state: GechoOutState
  onMove: (snakeId: number, end: SnakeEnd, direction: Direction) => MoveResult
}

interface DragInfo {
  snakeId: number
  end: SnakeEnd
  originX: number
  originY: number
}

export function GechoOutBoard({ state, onMove }: Props) {
  const { size, current, holes, obstacles, cleared } = state
  const cellSize = Math.floor((SCREEN_WIDTH - BOARD_PADDING) / size)

  const boardRef = useRef<View>(null)
  const boardPosRef = useRef({ x: 0, y: 0 })
  const stateRef = useRef(state)
  stateRef.current = state
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  const measureBoard = useCallback(() => {
    requestAnimationFrame(() => {
      boardRef.current?.measureInWindow((x, y) => {
        boardPosRef.current = { x, y }
      })
    })
  }, [])

  const getCellAt = useCallback(
    (pageX: number, pageY: number) => {
      const col = Math.floor((pageX - boardPosRef.current.x) / cellSize)
      const row = Math.floor((pageY - boardPosRef.current.y) / cellSize)
      if (row >= 0 && row < size && col >= 0 && col < size) return { row, col }
      return null
    },
    [cellSize, size]
  )

  const cellMap = useMemo(() => {
    const map = new Map<string, { color: number; isHead: boolean; isTail: boolean }>()
    for (const snake of current) {
      snake.cells.forEach((c, idx) => {
        map.set(`${c.row},${c.col}`, {
          color: snake.color,
          isHead: idx === snake.cells.length - 1,
          isTail: idx === 0,
        })
      })
    }
    return map
  }, [current])

  const holeMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const hole of holes) {
      if (!cleared.includes(hole.color)) {
        map.set(`${hole.position.row},${hole.position.col}`, hole.color)
      }
    }
    return map
  }, [holes, cleared])

  const obstacleSet = useMemo(() => new Set(obstacles.map((o) => `${o.row},${o.col}`)), [obstacles])

  const panResponder = useMemo(() => {
    let drag: DragInfo | null = null
    const threshold = cellSize * DRAG_THRESHOLD_RATIO

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        drag = null
        const cell = getCellAt(e.nativeEvent.pageX, e.nativeEvent.pageY)
        if (!cell) return

        for (const snake of stateRef.current.current) {
          const head = snake.cells[snake.cells.length - 1]
          const tail = snake.cells[0]
          if (head && head.row === cell.row && head.col === cell.col) {
            drag = { snakeId: snake.id, end: 'head', originX: e.nativeEvent.pageX, originY: e.nativeEvent.pageY }
            return
          }
          if (tail && tail.row === cell.row && tail.col === cell.col) {
            drag = { snakeId: snake.id, end: 'tail', originX: e.nativeEvent.pageX, originY: e.nativeEvent.pageY }
            return
          }
        }
      },
      onPanResponderMove: (e) => {
        if (!drag) return
        const dx = e.nativeEvent.pageX - drag.originX
        const dy = e.nativeEvent.pageY - drag.originY

        let direction: Direction | null = null
        if (Math.abs(dx) >= threshold && Math.abs(dx) >= Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left'
        } else if (Math.abs(dy) >= threshold) {
          direction = dy > 0 ? 'down' : 'up'
        }
        if (!direction) return

        const result = onMoveRef.current(drag.snakeId, drag.end, direction)
        if (!result.applied) return
        if (result.cleared) {
          drag = null
          return
        }

        const delta = DIRECTION_DELTA[direction]
        drag.originX += delta.col * cellSize
        drag.originY += delta.row * cellSize
      },
      onPanResponderRelease: () => {
        drag = null
      },
      onPanResponderTerminate: () => {
        drag = null
      },
    })
  }, [cellSize, getCellAt])

  return (
    <View
      ref={boardRef}
      onLayout={measureBoard}
      style={[styles.board, { width: cellSize * size, height: cellSize * size }]}
      {...panResponder.panHandlers}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const key = `${row},${col}`
            const isObstacle = obstacleSet.has(key)
            const holeColor = holeMap.get(key)
            const snakeCell = cellMap.get(key)

            return (
              <View
                key={col}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  isObstacle && styles.obstacle,
                ]}
              >
                {holeColor !== undefined && !snakeCell && (
                  <View
                    style={[
                      styles.hole,
                      {
                        width: cellSize * 0.6,
                        height: cellSize * 0.6,
                        borderRadius: cellSize * 0.3,
                        borderColor: SNAKE_COLORS[holeColor % SNAKE_COLORS.length],
                      },
                    ]}
                  />
                )}
                {snakeCell && (
                  <View
                    style={[
                      styles.snakeCell,
                      {
                        width: cellSize * 0.86,
                        height: cellSize * 0.86,
                        borderRadius: cellSize * 0.18,
                        backgroundColor: SNAKE_COLORS[snakeCell.color % SNAKE_COLORS.length],
                      },
                    ]}
                  >
                    {snakeCell.isHead && (
                      <View style={[styles.eye, { width: cellSize * 0.18, height: cellSize * 0.18, borderRadius: cellSize * 0.09 }]} />
                    )}
                    {snakeCell.isTail && (
                      <View style={[styles.tailMark, { width: cellSize * 0.22, height: cellSize * 0.22, borderRadius: cellSize * 0.04 }]} />
                    )}
                  </View>
                )}
              </View>
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
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  obstacle: {
    backgroundColor: '#333',
  },
  hole: {
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  snakeCell: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  eye: {
    backgroundColor: '#fff',
  },
  tailMark: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
})
