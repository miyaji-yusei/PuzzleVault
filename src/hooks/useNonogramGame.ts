import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/nonogram'
import { NonogramState, NonogramMove, CellState } from '../engines/nonogram/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3

export function useNonogramGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<NonogramState>(() => {
    const puzzle = generate(difficulty, seed)
    return {
      ...puzzle,
      current: Array.from({ length: puzzle.size }, () =>
        Array(puzzle.size).fill('empty') as CellState[]
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const lives = MAX_LIVES - state.mistakes

  const toggleCell = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return

    setState(prev => {
      const current = prev.current[row]?.[col] ?? 'empty'
      // Cycle: empty → filled → crossed → empty
      const next: CellState = current === 'empty' ? 'filled' : current === 'filled' ? 'crossed' : 'empty'
      const move: NonogramMove = { row, col, state: next }
      const result = validate(prev, move)

      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = next
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

  return { state, toggleCell, lives, isComplete, isGameOver }
}
