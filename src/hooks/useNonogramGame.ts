import { useState, useCallback } from 'react'
import { generate } from '../engines/nonogram'
import { NonogramState, CellState } from '../engines/nonogram/types'
import { Difficulty } from '../types/engine'

export type NonogramMode = 'fill' | 'cross'

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
  const [mode, setMode] = useState<NonogramMode>('fill')

  const setCell = useCallback((row: number, col: number) => {
    if (isComplete) return
    setState(prev => {
      const nextCell: CellState = mode === 'fill' ? 'filled' : 'crossed'
      if ((prev.current[row]?.[col] ?? 'empty') === nextCell) return prev

      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = nextCell

      const complete = prev.solution.every((sRow, r) =>
        sRow.every((sol, c) => sol === (newCurrent[r][c] === 'filled'))
      )
      if (complete) setIsComplete(true)

      return { ...prev, current: newCurrent }
    })
  }, [isComplete, mode])

  const restart = useCallback(() => {
    const puzzle = generate(difficulty)
    setState({
      ...puzzle,
      current: Array.from({ length: puzzle.size }, () =>
        Array(puzzle.size).fill('empty') as CellState[]
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setIsComplete(false)
  }, [difficulty])

  return { state, setCell, mode, setMode, isComplete, restart }
}
