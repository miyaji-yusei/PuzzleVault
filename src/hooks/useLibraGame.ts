import { useState, useCallback, useRef } from 'react'
import { generate, validate } from '../engines/libra'
import { LibraState, LibraMove, CellValue } from '../engines/libra/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3
const FLASH_MS = 800
const DELAY_MS = 1000

type PendingMove = {
  row: number
  col: number
  value: CellValue
  timer: ReturnType<typeof setTimeout>
}

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
  const [flashWrongCell, setFlashWrongCell] = useState<{ row: number; col: number } | null>(null)

  const stateRef = useRef(state)
  stateRef.current = state
  const pendingRef = useRef<PendingMove | null>(null)

  const lives = MAX_LIVES - state.mistakes

  const commitValidation = useCallback((row: number, col: number, value: CellValue) => {
    const s = stateRef.current
    if (s.current[row]?.[col] !== value) return

    const move: LibraMove = { row, col, value }
    const result = validate(s, move)

    if (result.correct) {
      if (result.isComplete) setIsComplete(true)
    } else {
      setFlashWrongCell({ row, col })
      setTimeout(() => {
        setFlashWrongCell(null)
        setState(prev => {
          const nc = prev.current.map(r => [...r]) as CellValue[][]
          if (nc[row]?.[col] === value) nc[row][col] = null
          const newMistakes = prev.mistakes + 1
          if (newMistakes >= MAX_LIVES) setIsGameOver(true)
          return { ...prev, current: nc, mistakes: newMistakes }
        })
      }, FLASH_MS)
    }
  }, [])

  const pressCell = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver || flashWrongCell) return

    const pending = pendingRef.current
    if (pending) {
      clearTimeout(pending.timer)
      pendingRef.current = null
      if (pending.row !== row || pending.col !== col) {
        commitValidation(pending.row, pending.col, pending.value)
      }
      // Same cell: just cancel, user is cycling the value
    }

    if (stateRef.current.initial[row]?.[col] !== null) return

    const currentVal = stateRef.current.current[row]?.[col] ?? null
    const next: CellValue = currentVal === null ? 'A' : currentVal === 'A' ? 'B' : null

    setState(prev => {
      if (prev.initial[row]?.[col] !== null) return prev
      const nc = prev.current.map(r => [...r]) as CellValue[][]
      nc[row][col] = next
      return { ...prev, current: nc }
    })

    if (next !== null) {
      const timer = setTimeout(() => {
        pendingRef.current = null
        commitValidation(row, col, next)
      }, DELAY_MS)
      pendingRef.current = { row, col, value: next, timer }
    }
  }, [isComplete, isGameOver, flashWrongCell, commitValidation])

  const restart = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer)
      pendingRef.current = null
    }
    const puzzle = generate(difficulty, Date.now())
    setState({
      ...puzzle,
      current: puzzle.initial.map(row => [...row]) as CellValue[][],
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setIsComplete(false)
    setIsGameOver(false)
    setFlashWrongCell(null)
  }, [difficulty])

  return { state, pressCell, lives, isComplete, isGameOver, flashWrongCell, restart }
}
