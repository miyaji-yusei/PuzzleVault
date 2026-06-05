import { useState, useCallback, useEffect, useRef } from 'react'
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

  const prevDifficultyRef = useRef<Difficulty | null>(null)
  useEffect(() => {
    if (prevDifficultyRef.current !== null && prevDifficultyRef.current !== difficulty) {
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
      setMode('fill')
    }
    prevDifficultyRef.current = difficulty
  }, [difficulty])

  const checkComplete = (solution: boolean[][], current: CellState[][]): boolean =>
    solution.every((sRow, r) => sRow.every((sol, c) => sol === (current[r]?.[c] === 'filled')))

  const setCell = useCallback((row: number, col: number) => {
    if (isComplete) return
    setState(prev => {
      const nextCell: CellState = mode === 'fill' ? 'filled' : 'crossed'
      if ((prev.current[row]?.[col] ?? 'empty') === nextCell) return prev

      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = nextCell

      if (checkComplete(prev.solution, newCurrent)) setIsComplete(true)
      return { ...prev, current: newCurrent }
    })
  }, [isComplete, mode])

  const setCellTo = useCallback((row: number, col: number, target: CellState) => {
    if (isComplete) return
    setState(prev => {
      if ((prev.current[row]?.[col] ?? 'empty') === target) return prev
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = target
      if (target === 'filled' && checkComplete(prev.solution, newCurrent)) setIsComplete(true)
      return { ...prev, current: newCurrent }
    })
  }, [isComplete])

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

  return { state, setCell, setCellTo, mode, setMode, isComplete, restart }
}
