import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/sudoku'
import { SudokuState, SudokuMove } from '../engines/sudoku/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3

export function useSudokuGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<SudokuState>(() => {
    const puzzle = generate(difficulty, seed)
    return {
      ...puzzle,
      current: puzzle.board.map(row => [...row]),
      notes: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => Array(10).fill(false) as boolean[])
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    }
  })
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)

  const selectCell = useCallback((row: number, col: number) => {
    setSelectedCell([row, col])
  }, [])

  const enterNumber = useCallback((value: number | null) => {
    if (!selectedCell || isComplete) return
    const [row, col] = selectedCell
    if (state.board[row]?.[col] !== null) return

    const move: SudokuMove = {
      row,
      col,
      value: value as SudokuMove['value'],
      isNote: false,
    }
    const result = validate(state, move)
    const cellKey = `${row}-${col}`

    setState(prev => {
      const newCurrent = prev.current.map(r => [...r])
      newCurrent[row][col] = value as SudokuMove['value']
      return { ...prev, current: newCurrent }
    })

    if (!result.correct || value === null) {
      if (value !== null) {
        setWrongCells(prev => new Set(prev).add(cellKey))
      } else {
        setWrongCells(prev => { const n = new Set(prev); n.delete(cellKey); return n })
      }
    } else {
      setWrongCells(prev => { const n = new Set(prev); n.delete(cellKey); return n })
      if (result.isComplete) setIsComplete(true)
    }
  }, [selectedCell, state, isComplete])

  const restart = useCallback(() => {
    const puzzle = generate(difficulty)
    setState({
      ...puzzle,
      current: puzzle.board.map(row => [...row]),
      notes: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => Array(10).fill(false) as boolean[])
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setSelectedCell(null)
    setWrongCells(new Set())
    setIsComplete(false)
  }, [difficulty])

  return { state, selectedCell, selectCell, enterNumber, wrongCells, isComplete, restart }
}
