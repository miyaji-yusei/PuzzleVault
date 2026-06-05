import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/sums'
import { SumsState, SumsMove, CellValue } from '../engines/sums/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES: Record<Difficulty, number | null> = {
  easy: null,
  normal: 5,
  hard: 3,
  expert: 3,
}

function initState(difficulty: Difficulty, seed?: number): SumsState {
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
  const [state, setState] = useState<SumsState>(() => initState(difficulty, seed))
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)
  const [lives, setLives] = useState<number | null>(MAX_LIVES[difficulty])

  const selectCell = useCallback((row: number, col: number) => {
    const cell = state.grid[row]?.[col]
    if (!cell || cell.type !== 'white') return
    setSelectedCell([row, col])
  }, [state.grid])

  const enterNumber = useCallback((value: CellValue) => {
    if (!selectedCell || isComplete) return
    const [row, col] = selectedCell

    if (value === null) {
      setState(prev => {
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
    setState(initState(difficulty))
    setSelectedCell(null)
    setWrongCells(new Set())
    setIsComplete(false)
    setLives(MAX_LIVES[difficulty])
  }, [difficulty])

  return {
    state,
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
