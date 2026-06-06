import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/sudoku'
import { SudokuState, SudokuMove } from '../engines/sudoku/types'
import { Difficulty } from '../types/engine'

function makeNotes() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => Array(10).fill(false) as boolean[])
  )
}

export function useSudokuGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<SudokuState>(() => {
    const puzzle = generate(difficulty, seed)
    return {
      ...puzzle,
      current: puzzle.board.map(row => [...row]),
      notes: makeNotes(),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    }
  })
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)
  const [noteMode, setNoteMode] = useState(false)

  const selectCell = useCallback((row: number, col: number) => {
    setSelectedCell([row, col])
  }, [])

  const toggleNoteMode = useCallback(() => setNoteMode(prev => !prev), [])

  const enterNumber = useCallback((value: number | null) => {
    if (!selectedCell || isComplete) return
    const [row, col] = selectedCell
    if (state.board[row]?.[col] !== null) return

    // メモモード: 候補数字をトグル
    if (noteMode && value !== null) {
      setState(prev => {
        const newNotes = prev.notes.map(r => r.map(c => [...c]))
        newNotes[row]![col]![value] = !newNotes[row]![col]![value]
        return { ...prev, notes: newNotes }
      })
      return
    }

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
      newCurrent[row]![col] = value as SudokuMove['value']
      // 確定入力でこのセルのメモをクリア
      const newNotes = prev.notes.map(r => r.map(c => [...c]))
      newNotes[row]![col] = Array(10).fill(false)
      // 同行・同列・同ブロックの関連メモを自動削除
      if (result.correct && value !== null) {
        const boxR = Math.floor(row / 3) * 3
        const boxC = Math.floor(col / 3) * 3
        for (let i = 0; i < 9; i++) {
          newNotes[row]![i]![value] = false
          newNotes[i]![col]![value] = false
        }
        for (let r = boxR; r < boxR + 3; r++) {
          for (let c = boxC; c < boxC + 3; c++) {
            newNotes[r]![c]![value] = false
          }
        }
      }
      return { ...prev, current: newCurrent, notes: newNotes }
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
  }, [selectedCell, state, isComplete, noteMode])

  // 全空白マスに入力可能な候補数字を一括入力（既存メモと統合）
  const autoMemo = useCallback(() => {
    if (isComplete) return
    setState(prev => {
      const newNotes = prev.notes.map(r => r.map(c => [...c]))
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (prev.board[row]?.[col] !== null) continue
          if (prev.current[row]?.[col] !== null) continue
          const used = new Set<number>()
          const boxR = Math.floor(row / 3) * 3
          const boxC = Math.floor(col / 3) * 3
          for (let i = 0; i < 9; i++) {
            const rv = prev.current[row]?.[i]; if (rv != null) used.add(rv)
            const cv = prev.current[i]?.[col]; if (cv != null) used.add(cv)
          }
          for (let r = boxR; r < boxR + 3; r++)
            for (let c = boxC; c < boxC + 3; c++) {
              const bv = prev.current[r]?.[c]; if (bv != null) used.add(bv)
            }
          for (let n = 1; n <= 9; n++) {
            if (!used.has(n)) newNotes[row]![col]![n] = true
          }
        }
      }
      return { ...prev, notes: newNotes }
    })
  }, [isComplete])

  const restart = useCallback(() => {
    const puzzle = generate(difficulty)
    setState({
      ...puzzle,
      current: puzzle.board.map(row => [...row]),
      notes: makeNotes(),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setSelectedCell(null)
    setWrongCells(new Set())
    setIsComplete(false)
    setNoteMode(false)
  }, [difficulty])

  return { state, selectedCell, selectCell, enterNumber, wrongCells, isComplete, noteMode, toggleNoteMode, autoMemo, restart }
}
