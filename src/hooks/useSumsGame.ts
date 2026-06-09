import { useState, useCallback, useEffect } from 'react'
import { generate, validate } from '../engines/sums'
import { SumsState, SumsMove, CellValue } from '../engines/sums/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES: Record<Difficulty, number | null> = {
  easy: null,
  normal: 5,
  hard: 3,
  expert: 3,
}

function buildState(difficulty: Difficulty, seed?: number): SumsState {
  const puzzle = generate(difficulty, seed)
  return {
    ...puzzle,
    current: puzzle.grid.map(row => row.map((): CellValue => null)),
    notes: puzzle.grid.map(row => row.map(() => new Set<number>())),
    mistakes: 0,
    hintsUsed: 0,
    startedAt: Date.now(),
    elapsedSeconds: 0,
  }
}

export function useSumsGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<SumsState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)
  const [lives, setLives] = useState<number | null>(MAX_LIVES[difficulty])

  useEffect(() => {
    setIsLoading(true)
    setIsComplete(false)
    setSelectedCell(null)
    setWrongCells(new Set())
    setLives(MAX_LIVES[difficulty])
    const id = setTimeout(() => {
      setState(buildState(difficulty, seed))
      setIsLoading(false)
    }, 0)
    return () => clearTimeout(id)
  // seed intentionally excluded to avoid re-generating when seed is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty])

  const selectCell = useCallback((row: number, col: number) => {
    if (!state) return
    const cell = state.grid[row]?.[col]
    if (!cell || cell.type !== 'white') return
    setSelectedCell([row, col])
  }, [state])

  const enterNumber = useCallback((value: CellValue) => {
    if (!state || !selectedCell || isComplete) return
    const [row, col] = selectedCell

    if (value === null) {
      setState(prev => {
        if (!prev) return prev
        const newCurrent = prev.current.map(r => [...r])
        newCurrent[row]![col] = null
        return { ...prev, current: newCurrent }
      })
      setWrongCells(prev => {
        const n = new Set(prev)
        n.delete(`${row}-${col}`)
        return n
      })
      return
    }

    const move: SumsMove = { row, col, value, isNote: false }
    const result = validate(state, move)

    if (result.correct) {
      setState(prev => {
        if (!prev) return prev
        const newCurrent = prev.current.map(r => [...r])
        newCurrent[row]![col] = value
        return { ...prev, current: newCurrent }
      })
      setWrongCells(prev => {
        const n = new Set(prev)
        n.delete(`${row}-${col}`)
        return n
      })
      if (result.isComplete) setIsComplete(true)
    } else {
      setWrongCells(prev => new Set(prev).add(`${row}-${col}`))
      setLives(prev => (prev === null ? null : Math.max(0, prev - 1)))
    }
  }, [selectedCell, state, isComplete])

  const restart = useCallback(() => {
    setIsLoading(true)
    setIsComplete(false)
    setSelectedCell(null)
    setWrongCells(new Set())
    setLives(MAX_LIVES[difficulty])
    setTimeout(() => {
      setState(buildState(difficulty))
      setIsLoading(false)
    }, 0)
  }, [difficulty])

  return {
    state,
    isLoading,
    selectedCell,
    wrongCells,
    isComplete,
    lives,
    isGameOver: lives !== null && lives <= 0,
    selectCell,
    enterNumber,
    restart,
  }
}
