import { useState, useCallback, useEffect, useRef } from 'react'
import { generate } from '../engines/sums'
import { SumsState, CellMark } from '../engines/sums/types'
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
    current: Array.from({ length: 5 }, () => Array<CellMark>(5).fill(null)),
    mistakes: 0,
    startedAt: Date.now(),
    elapsedSeconds: 0,
  }
}

export function useSumsGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<SumsState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set())
  const [isComplete, setIsComplete] = useState(false)
  const [lives, setLives] = useState<number | null>(MAX_LIVES[difficulty])

  const stateRef = useRef<SumsState | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCellsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    setIsLoading(true)
    setIsComplete(false)
    setFlashCells(new Set())
    setLives(MAX_LIVES[difficulty])
    pendingCellsRef.current.clear()
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    const id = setTimeout(() => {
      const s = buildState(difficulty, seed)
      setState(s)
      stateRef.current = s
      setIsLoading(false)
    }, 0)
    return () => clearTimeout(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty])

  const validatePending = useCallback(() => {
    const s = stateRef.current
    if (!s) return

    const wrongKeys: string[] = []
    for (const key of pendingCellsRef.current) {
      const [r, c] = key.split(',').map(Number) as [number, number]
      const current = s.current[r]?.[c]
      const expected = s.solution[r]?.[c]
      if (current !== null && current !== expected) {
        wrongKeys.push(key)
      }
    }
    pendingCellsRef.current.clear()

    if (wrongKeys.length > 0) {
      setFlashCells(new Set(wrongKeys))
      setState(prev => {
        if (!prev) return prev
        const newCurrent = prev.current.map(r => [...r])
        for (const key of wrongKeys) {
          const [r, c] = key.split(',').map(Number) as [number, number]
          newCurrent[r]![c] = null
        }
        const updated = { ...prev, current: newCurrent, mistakes: prev.mistakes + 1 }
        stateRef.current = updated
        return updated
      })
      setLives(prev => (prev === null ? null : Math.max(0, prev - 1)))
      setTimeout(() => setFlashCells(new Set()), 800)
    }
  }, [])

  const tapCell = useCallback((row: number, col: number) => {
    if (isComplete) return
    setState(prev => {
      if (!prev) return prev
      const currentMark = prev.current[row]?.[col] ?? null
      const nextMark: CellMark =
        currentMark === null ? 'cross' : currentMark === 'cross' ? 'circle' : null

      const newCurrent = prev.current.map(r => [...r])
      newCurrent[row]![col] = nextMark

      // Check completion
      const done = prev.solution.every((sRow, r) =>
        sRow.every((expectedMark, c) => newCurrent[r]?.[c] === expectedMark)
      )

      const updated = { ...prev, current: newCurrent }
      stateRef.current = updated
      if (done) setIsComplete(true)
      return updated
    })

    // Track cell for delayed validation
    const key = `${row},${col}`
    pendingCellsRef.current.add(key)

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = setTimeout(validatePending, 1000)
  }, [isComplete, validatePending])

  const restart = useCallback(() => {
    setIsLoading(true)
    setIsComplete(false)
    setFlashCells(new Set())
    setLives(MAX_LIVES[difficulty])
    pendingCellsRef.current.clear()
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    setTimeout(() => {
      const s = buildState(difficulty)
      setState(s)
      stateRef.current = s
      setIsLoading(false)
    }, 0)
  }, [difficulty])

  return {
    state,
    isLoading,
    flashCells,
    isComplete,
    lives,
    isGameOver: lives !== null && lives <= 0,
    tapCell,
    restart,
  }
}
