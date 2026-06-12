import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, PanResponder, Dimensions, Animated } from 'react-native'
import { DIRECTION_DELTA } from '../../../engines/gechoout'
import { Direction, GechoOutState, Position, Snake, SnakeEnd } from '../../../engines/gechoout/types'
import { MoveResult } from '../../../hooks/useGechooutGame'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOARD_PADDING = 32

const SNAKE_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b']

const DRAG_THRESHOLD_RATIO = 0.5
const INNER_RATIO = 0.86
const MOVE_MS = 90
const VANISH_MS = 150

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

interface AnimSnake {
  id: number
  color: number
  cellsLen: number
  anims: Animated.ValueXY[]
  opacity: Animated.Value
  scale: Animated.Value
}

// セルの論理座標を、盤面内のピクセル位置(蛇セグメント用、INNER_RATIO分のオフセット込み)に変換する
function toPixel(pos: Position, cellSize: number): { x: number; y: number } {
  const offset = (cellSize * (1 - INNER_RATIO)) / 2
  return { x: pos.col * cellSize + offset, y: pos.row * cellSize + offset }
}

function buildAnimSnakes(snakes: Snake[], cellSize: number): AnimSnake[] {
  return snakes.map((s) => ({
    id: s.id,
    color: s.color,
    cellsLen: s.cells.length,
    anims: s.cells.map((c) => new Animated.ValueXY(toPixel(c, cellSize))),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(1),
  }))
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

  const [animSnakes, setAnimSnakes] = useState<AnimSnake[]>(() => buildAnimSnakes(current, cellSize))
  const prevPuzzleIdRef = useRef(state.id)

  // current(蛇の位置)が変わるたびに、各セグメントを新しい位置へスライドアニメーションさせる。
  // 蛇が穴に入って消えた場合はフェード+縮小してから一覧から除去する。
  // 別のパズル(リスタート/難易度変更)に切り替わった場合はアニメーションなしで即時再構築する。
  useEffect(() => {
    if (prevPuzzleIdRef.current !== state.id) {
      prevPuzzleIdRef.current = state.id
      setAnimSnakes(buildAnimSnakes(current, cellSize))
      return
    }

    setAnimSnakes((prev) => {
      const next: AnimSnake[] = []

      for (const snake of current) {
        const existing = prev.find((a) => a.id === snake.id)
        if (!existing || existing.cellsLen !== snake.cells.length) {
          next.push({
            id: snake.id,
            color: snake.color,
            cellsLen: snake.cells.length,
            anims: snake.cells.map((c) => new Animated.ValueXY(toPixel(c, cellSize))),
            opacity: new Animated.Value(1),
            scale: new Animated.Value(1),
          })
          continue
        }

        snake.cells.forEach((cell, i) => {
          Animated.timing(existing.anims[i]!, {
            toValue: toPixel(cell, cellSize),
            duration: MOVE_MS,
            useNativeDriver: true,
          }).start()
        })
        next.push(existing)
      }

      for (const old of prev) {
        if (current.some((s) => s.id === old.id)) continue
        next.push(old)
        Animated.parallel([
          Animated.timing(old.opacity, { toValue: 0, duration: VANISH_MS, useNativeDriver: true }),
          Animated.timing(old.scale, { toValue: 0.3, duration: VANISH_MS, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) {
            setAnimSnakes((cur) => cur.filter((a) => a.id !== old.id))
          }
        })
      }

      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, cellSize])

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

            return (
              <View
                key={col}
                style={[
                  styles.cell,
                  { width: cellSize, height: cellSize },
                  isObstacle && styles.obstacle,
                ]}
              >
                {holeColor !== undefined && (
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
              </View>
            )
          })}
        </View>
      ))}

      {/* 蛇のオーバーレイ: 各セグメントを絶対配置し、移動時はスライド・消去時はフェード+縮小でアニメーションする */}
      <View style={styles.overlay} pointerEvents="none">
        {animSnakes.flatMap((snake) =>
          Array.from({ length: snake.cellsLen }, (_, i) => {
            const isHead = i === snake.cellsLen - 1
            const isTail = i === 0

            return (
              <Animated.View
                key={`${snake.id}-${i}`}
                style={[
                  styles.snakeCell,
                  {
                    width: cellSize * INNER_RATIO,
                    height: cellSize * INNER_RATIO,
                    borderRadius: cellSize * 0.18,
                    backgroundColor: SNAKE_COLORS[snake.color % SNAKE_COLORS.length],
                    opacity: snake.opacity,
                    transform: [...snake.anims[i]!.getTranslateTransform(), { scale: snake.scale }],
                  },
                ]}
              >
                {isHead && (
                  <View style={[styles.eye, { width: cellSize * 0.18, height: cellSize * 0.18, borderRadius: cellSize * 0.09 }]} />
                )}
                {isTail && (
                  <View style={[styles.tailMark, { width: cellSize * 0.22, height: cellSize * 0.22, borderRadius: cellSize * 0.04 }]} />
                )}
              </Animated.View>
            )
          })
        )}
      </View>
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  snakeCell: {
    position: 'absolute',
    top: 0,
    left: 0,
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
