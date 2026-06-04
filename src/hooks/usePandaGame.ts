import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/panda'
import { PandaState, PandaMove, CellContent } from '../engines/panda/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3

export function usePandaGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<PandaState>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
    const current: CellContent[][] = puzzle.fixed.map(row =>
      row.map(cell => (cell === 'A' ? 'A' : 'empty'))
    )
    return {
      ...puzzle,
      current,
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    }
  })
  const [isComplete, setIsComplete] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const lives = MAX_LIVES - state.mistakes

  // シングルタップ → ✕ を配置（ライフ消費なし）
  const placeCross = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    setState(prev => {
      if (prev.fixed[row][col] === 'A') return prev
      const current = prev.current[row]?.[col] ?? 'empty'
      if (current === 'B') return prev
      const next: CellContent = current === 'empty' ? 'crossed' : 'empty'
      const newCurrent = prev.current.map(r => [...r]) as CellContent[][]
      newCurrent[row][col] = next
      return { ...prev, current: newCurrent }
    })
  }, [isComplete, isGameOver])

  // ダブルタップ → 🐼 を配置（誤配置でライフ消費）
  const placePanda = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    setState(prev => {
      if (prev.fixed[row][col] === 'A') return prev
      const current = prev.current[row]?.[col] ?? 'empty'
      const next: CellContent = current === 'B' ? 'empty' : 'B'

      if (next === 'empty') {
        const newCurrent = prev.current.map(r => [...r]) as CellContent[][]
        newCurrent[row][col] = 'empty'
        return { ...prev, current: newCurrent }
      }

      const move: PandaMove = { row, col, value: 'B' }
      const result = validate(prev, move)

      const newCurrent = prev.current.map(r => [...r]) as CellContent[][]
      newCurrent[row][col] = result.correct ? 'B' : 'empty'

      const newState = {
        ...prev,
        current: newCurrent,
        mistakes: result.lifeLost ? prev.mistakes + 1 : prev.mistakes,
      }

      if (result.isComplete) setIsComplete(true)
      else if (result.lifeLost && newState.mistakes >= MAX_LIVES) setIsGameOver(true)

      return newState
    })
  }, [isComplete, isGameOver])

  const restart = useCallback(() => {
    const puzzle = generate(difficulty, Date.now())
    const current: CellContent[][] = puzzle.fixed.map(row =>
      row.map(cell => (cell === 'A' ? 'A' : 'empty'))
    )
    setState({
      ...puzzle,
      current,
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setIsComplete(false)
    setIsGameOver(false)
  }, [difficulty])

  return { state, placeCross, placePanda, lives, isComplete, isGameOver, restart }
}
