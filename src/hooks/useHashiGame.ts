import { useState, useCallback, useRef } from 'react'
import { generate } from '../engines/hashi'
import { HashiState } from '../engines/hashi/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES: Record<Difficulty, number | null> = {
  easy: null,
  normal: 5,
  hard: 3,
  expert: 3,
}

export function useHashiGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<HashiState>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
    return {
      ...puzzle,
      current: [],
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const maxLives = MAX_LIVES[difficulty]
  const lives = maxLives !== null ? maxLives - state.mistakes : null

  // Map bridgeKey → timeout id for pending validation
  const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const maxLivesRef = useRef(maxLives)
  maxLivesRef.current = maxLives
  const isCompleteRef = useRef(isComplete)
  isCompleteRef.current = isComplete
  const isGameOverRef = useRef(isGameOver)
  isGameOverRef.current = isGameOver

  const toggleBridge = useCallback((fromIslandId: number, toIslandId: number) => {
    if (isCompleteRef.current || isGameOverRef.current) return

    const bridgeKey = `${Math.min(fromIslandId, toIslandId)}-${Math.max(fromIslandId, toIslandId)}`

    setState(prev => {
      const getIslandCurrent = (id: number) =>
        prev.current.reduce((sum, b) => (b.from === id || b.to === id) ? sum + b.count : sum, 0)
      const fromIsland = prev.islands.find(i => i.id === fromIslandId)
      const toIsland = prev.islands.find(i => i.id === toIslandId)
      const fromSatisfied = fromIsland && getIslandCurrent(fromIslandId) >= fromIsland.bridges
      const toSatisfied = toIsland && getIslandCurrent(toIslandId) >= toIsland.bridges
      if (fromSatisfied || toSatisfied) return prev

      const existing = prev.current.find(
        b => (b.from === fromIslandId && b.to === toIslandId) ||
             (b.from === toIslandId && b.to === fromIslandId)
      )
      const currentCount = existing?.count ?? 0

      if (currentCount === 2) {
        // Remove bridge — cancel any pending validation
        const existingTimeout = pendingTimeoutsRef.current.get(bridgeKey)
        if (existingTimeout !== undefined) {
          clearTimeout(existingTimeout)
          pendingTimeoutsRef.current.delete(bridgeKey)
        }
        return {
          ...prev,
          current: prev.current.filter(
            b => !((b.from === fromIslandId && b.to === toIslandId) ||
                   (b.from === toIslandId && b.to === fromIslandId))
          ),
        }
      }

      // Add bridge optimistically
      const newCount = (currentCount + 1) as 1 | 2
      const newCurrent = [
        ...prev.current.filter(
          b => !((b.from === fromIslandId && b.to === toIslandId) ||
                 (b.from === toIslandId && b.to === fromIslandId))
        ),
        { from: fromIslandId, to: toIslandId, count: newCount },
      ]

      // Cancel previous pending timeout for this bridge
      const existingTimeout = pendingTimeoutsRef.current.get(bridgeKey)
      if (existingTimeout !== undefined) {
        clearTimeout(existingTimeout)
      }

      // Schedule 1-second validation
      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current.delete(bridgeKey)
        setState(s => {
          const bridge = s.current.find(
            b => (b.from === fromIslandId && b.to === toIslandId) ||
                 (b.from === toIslandId && b.to === fromIslandId)
          )
          if (!bridge) return s

          const solutionBridge = s.solution.find(
            b => (b.from === fromIslandId && b.to === toIslandId) ||
                 (b.from === toIslandId && b.to === fromIslandId)
          )
          const solutionCount = solutionBridge?.count ?? 0

          if (bridge.count > solutionCount) {
            // Wrong bridge — remove and count mistake
            const newMistakes = s.mistakes + 1
            const ml = maxLivesRef.current
            if (ml !== null && ml - newMistakes <= 0) {
              setTimeout(() => setIsGameOver(true), 0)
            }
            return {
              ...s,
              mistakes: newMistakes,
              current: s.current.filter(
                b => !((b.from === fromIslandId && b.to === toIslandId) ||
                       (b.from === toIslandId && b.to === fromIslandId))
              ),
            }
          }

          // Correct bridge — check completion
          const complete = s.solution.every(sb => {
            const cb = s.current.find(
              b => (b.from === sb.from && b.to === sb.to) ||
                   (b.from === sb.to && b.to === sb.from)
            )
            return cb?.count === sb.count
          })
          if (complete) setTimeout(() => setIsComplete(true), 0)
          return s
        })
      }, 1000)

      pendingTimeoutsRef.current.set(bridgeKey, timeoutId)
      return { ...prev, current: newCurrent }
    })
  }, [])

  const restart = useCallback(() => {
    // Cancel all pending validations
    pendingTimeoutsRef.current.forEach(t => clearTimeout(t))
    pendingTimeoutsRef.current.clear()
    const puzzle = generate(difficulty, Date.now())
    setState({
      ...puzzle,
      current: [],
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setIsComplete(false)
    setIsGameOver(false)
  }, [difficulty])

  return { state, lives, isComplete, isGameOver, toggleBridge, restart }
}
