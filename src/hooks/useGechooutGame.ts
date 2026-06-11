import { useCallback, useState } from 'react'
import { applyMove, createInitialState, generate, validate } from '../engines/gechoout'
import { Direction, GechoOutState, SnakeEnd } from '../engines/gechoout/types'
import { Difficulty } from '../types/engine'

export interface MoveResult {
  applied: boolean
  cleared: boolean
}

export function useGechooutGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<GechoOutState>(() =>
    createInitialState(generate(difficulty, seed ?? Date.now()))
  )
  const [isComplete, setIsComplete] = useState(false)
  const [moves, setMoves] = useState(0)

  // 蛇の頭/尾を1マス動かす。盤外・障害物・他の蛇との衝突は不正な手として無視する。
  const move = useCallback(
    (snakeId: number, end: SnakeEnd, direction: Direction): MoveResult => {
      if (isComplete) return { applied: false, cleared: false }

      let result: MoveResult = { applied: false, cleared: false }
      setState((prev) => {
        const validation = validate(prev, { snakeId, end, direction })
        if (!validation.correct) return prev

        const before = prev.current.length
        const next = applyMove(prev, { snakeId, end, direction })
        result = { applied: true, cleared: next.current.length < before }

        if (validation.isComplete) setIsComplete(true)
        return next
      })

      if (result.applied) setMoves((m) => m + 1)
      return result
    },
    [isComplete]
  )

  const restart = useCallback(() => {
    setState(createInitialState(generate(difficulty, Date.now())))
    setIsComplete(false)
    setMoves(0)
  }, [difficulty])

  return { state, move, isComplete, moves, restart }
}
