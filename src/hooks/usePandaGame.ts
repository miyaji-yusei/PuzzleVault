import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/panda'
import { PandaState, PandaMove, CellContent } from '../engines/panda/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3

export function usePandaGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<PandaState>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
    const current: CellContent[][] = puzzle.fixed.map(row =>
      row.map(cell => (cell === 'A' ? 'A' : 'empty'))
    )
    return {
      ...puzzle,
      current,
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const lives = MAX_LIVES - state.mistakes

  const pressCell = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return

    setState(prev => {
      // A cells are fixed
      if (prev.fixed[row][col] === 'A') return prev

      const current = prev.current[row]?.[col] ?? 'empty'
      // Cycle: empty → B → crossed → empty
      const next: CellContent =
        current === 'empty' ? 'B' : current === 'B' ? 'crossed' : 'empty'

      if (next === 'empty') {
        const newCurrent = prev.current.map(r => [...r]) as CellContent[][]
        newCurrent[row][col] = 'empty'
        return { ...prev, current: newCurrent }
      }

      const move: PandaMove = { row, col, value: next as 'B' | 'crossed' | 'empty' }
      const result = validate(prev, move)

      const newCurrent = prev.current.map(r => [...r]) as CellContent[][]
      if (result.correct) {
        newCurrent[row][col] = next
      } else {
        // Wrong B placement: stay empty (lifeLost)
        newCurrent[row][col] = 'empty'
      }

      const newState = {
        ...prev,
        current: newCurrent,
        mistakes: result.lifeLost ? prev.mistakes + 1 : prev.mistakes,
      }

      if (result.isComplete) setIsComplete(true)
      else if (result.lifeLost && newState.mistakes >= MAX_LIVES) setIsGameOver(true)

      return newState
    })
  }, [isComplete, isGameOver])

  return { state, pressCell, lives, isComplete, isGameOver }
}
