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
  const [isGameOver, setIsGameOver] = useState(false)

  const lives = MAX_LIVES - state.mistakes

  const selectCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.board[row]?.[col] !== null) return prev
      return prev
    })
    setSelectedCell(prev => {
      if (state.board[row]?.[col] !== null) return prev
      return [row, col]
    })
  }, [state.board])

  const enterNumber = useCallback((value: number | null) => {
    if (!selectedCell || isComplete || isGameOver) return
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
      return {
        ...prev,
        current: newCurrent,
        mistakes: result.lifeLost ? prev.mistakes + 1 : prev.mistakes,
      }
    })

    if (result.lifeLost) {
      setWrongCells(prev => new Set(prev).add(cellKey))
      if (state.mistakes + 1 >= MAX_LIVES) setIsGameOver(true)
    } else {
      setWrongCells(prev => {
        const next = new Set(prev)
        next.delete(cellKey)
        return next
      })
      if (result.isComplete) setIsComplete(true)
    }
  }, [selectedCell, state, isComplete, isGameOver])

  return { state, selectedCell, selectCell, enterNumber, wrongCells, lives, isComplete, isGameOver }
}
