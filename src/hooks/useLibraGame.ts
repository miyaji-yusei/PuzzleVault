import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/libra'
import { LibraState, LibraMove, CellValue } from '../engines/libra/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3

export function useLibraGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<LibraState>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
    return {
      ...puzzle,
      current: puzzle.initial.map(row => [...row]) as CellValue[][],
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
      // Fixed cells (pre-filled) cannot be changed
      if (prev.initial[row][col] !== null) return prev

      const current = prev.current[row]?.[col] ?? null
      // Cycle: null → A → B → null
      const next: CellValue = current === null ? 'A' : current === 'A' ? 'B' : null
      if (next === null) {
        const newCurrent = prev.current.map(r => [...r]) as CellValue[][]
        newCurrent[row][col] = null
        return { ...prev, current: newCurrent }
      }

      const move: LibraMove = { row, col, value: next }
      const result = validate(prev, move)

      const newCurrent = prev.current.map(r => [...r]) as CellValue[][]
      if (result.correct) {
        newCurrent[row][col] = next
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
