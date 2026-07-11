import { useState, useCallback, useRef } from 'react'
import { generate, validate } from '../engines/panda'
import { PandaState, PandaMove, CellContent } from '../engines/panda/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3
const DELAY_MS = 1000

type PendingPanda = {
  row: number
  col: number
  timer: ReturnType<typeof setTimeout>
}

export function usePandaGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<PandaState>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
    const current: CellContent[][] = puzzle.fixed.map(row =>
      row.map(cell => (cell === 'A' ? 'A' : 'empty'))
    )
    return { ...puzzle, current, mistakes: 0, hintsUsed: 0, startedAt: Date.now(), elapsedSeconds: 0 }
  })
  const [isComplete, setIsComplete] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [errorCell, setErrorCell] = useState<{ row: number; col: number } | null>(null)
  const [confirmedCells, setConfirmedCells] = useState<Set<string>>(new Set())

  const stateRef = useRef(state)
  stateRef.current = state
  const confirmedRef = useRef(confirmedCells)
  confirmedRef.current = confirmedCells
  const pendingRef = useRef<PendingPanda | null>(null)

  const lives = MAX_LIVES - state.mistakes

  const doValidatePanda = useCallback((row: number, col: number) => {
    const s = stateRef.current
    if (s.current[row]?.[col] !== 'B') return

    const move: PandaMove = { row, col, value: 'B' }
    const result = validate(s, move)

    if (result.correct) {
      setConfirmedCells(prev => new Set([...prev, `${row},${col}`]))
      if (result.isComplete) setIsComplete(true)
    } else {
      setState(prev => {
        const newMistakes = prev.mistakes + 1
        if (newMistakes >= MAX_LIVES) setTimeout(() => setIsGameOver(true), 0)
        return { ...prev, mistakes: newMistakes }
      })
      setErrorCell({ row, col })
    }
  }, [])

  const fixError = useCallback(() => {
    if (!errorCell) return
    const { row, col } = errorCell
    setState(prev => {
      const nc = prev.current.map(r => [...r]) as CellContent[][]
      nc[row][col] = 'empty'
      return { ...prev, current: nc }
    })
    setErrorCell(null)
  }, [errorCell])

  const tapCell = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    if (errorCell) {
      if (errorCell.row === row && errorCell.col === col) fixError()
      return
    }

    const s = stateRef.current
    if (s.fixed[row]?.[col] === 'A') return
    if (confirmedRef.current.has(`${row},${col}`)) return

    const pending = pendingRef.current
    if (pending) {
      clearTimeout(pending.timer)
      pendingRef.current = null
      if (pending.row !== row || pending.col !== col) {
        doValidatePanda(pending.row, pending.col)
      }
    }

    const current = s.current[row]?.[col] ?? 'empty'
    const next: CellContent = current === 'empty' ? 'crossed' : current === 'crossed' ? 'B' : 'empty'

    setState(prev => {
      if (prev.fixed[row]?.[col] === 'A') return prev
      const nc = prev.current.map(r => [...r]) as CellContent[][]
      nc[row][col] = next
      return { ...prev, current: nc }
    })

    if (next === 'B') {
      const timer = setTimeout(() => {
        pendingRef.current = null
        doValidatePanda(row, col)
      }, DELAY_MS)
      pendingRef.current = { row, col, timer }
    }
  }, [isComplete, isGameOver, errorCell, fixError, doValidatePanda])

  const dragCross = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver || errorCell) return
    const s = stateRef.current
    if (s.fixed[row]?.[col] === 'A') return
    if (confirmedRef.current.has(`${row},${col}`)) return
    if (s.current[row]?.[col] === 'B') return

    setState(prev => {
      if (prev.fixed[row]?.[col] === 'A') return prev
      if (prev.current[row]?.[col] === 'B') return prev
      const nc = prev.current.map(r => [...r]) as CellContent[][]
      nc[row][col] = 'crossed'
      return { ...prev, current: nc }
    })
  }, [isComplete, isGameOver, errorCell])

  const dragRemoveCross = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver || errorCell) return
    const s = stateRef.current
    if (s.fixed[row]?.[col] === 'A') return
    if (confirmedRef.current.has(`${row},${col}`)) return
    if (s.current[row]?.[col] !== 'crossed') return

    setState(prev => {
      if (prev.current[row]?.[col] !== 'crossed') return prev
      const nc = prev.current.map(r => [...r]) as CellContent[][]
      nc[row][col] = 'empty'
      return { ...prev, current: nc }
    })
  }, [isComplete, isGameOver, errorCell])

  const restart = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer)
      pendingRef.current = null
    }
    const puzzle = generate(difficulty, Date.now())
    const current: CellContent[][] = puzzle.fixed.map(row =>
      row.map(cell => (cell === 'A' ? 'A' : 'empty'))
    )
    setState({ ...puzzle, current, mistakes: 0, hintsUsed: 0, startedAt: Date.now(), elapsedSeconds: 0 })
    setIsComplete(false)
    setIsGameOver(false)
    setErrorCell(null)
    setConfirmedCells(new Set())
  }, [difficulty])

  return { state, tapCell, dragCross, dragRemoveCross, fixError, confirmedCells, errorCell, lives, isComplete, isGameOver, restart }
}
