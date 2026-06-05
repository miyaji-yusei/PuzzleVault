import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/hashi'
import { HashiState, HashiMove } from '../engines/hashi/types'
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

  const toggleBridge = useCallback((fromIslandId: number, toIslandId: number) => {
    if (isComplete || isGameOver) return

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
        return {
          ...prev,
          current: prev.current.filter(
            b => !((b.from === fromIslandId && b.to === toIslandId) ||
                   (b.from === toIslandId && b.to === fromIslandId))
          ),
        }
      }

      const move: HashiMove = { fromIslandId, toIslandId, action: 'add' }
      const result = validate(prev, move)

      if (!result.correct) {
        const newMistakes = prev.mistakes + 1
        if (maxLives !== null && maxLives - newMistakes <= 0) {
          setTimeout(() => setIsGameOver(true), 0)
        }
        return { ...prev, mistakes: newMistakes }
      }

      const newCurrent = [
        ...prev.current.filter(
          b => !((b.from === fromIslandId && b.to === toIslandId) ||
                 (b.from === toIslandId && b.to === fromIslandId))
        ),
        { from: fromIslandId, to: toIslandId, count: (currentCount + 1) as 1 | 2 },
      ]

      if (result.isComplete) {
        setTimeout(() => setIsComplete(true), 0)
      }

      return { ...prev, current: newCurrent }
    })
  }, [isComplete, isGameOver, maxLives])

  const restart = useCallback(() => {
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
