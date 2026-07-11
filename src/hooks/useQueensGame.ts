import { useState, useCallback } from 'react'
import { generate, validate } from '../engines/queens'
import { QueensState, QueensMove, CellState } from '../engines/queens/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES = 3

export function useQueensGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<QueensState>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
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
  const [isGameOver, setIsGameOver] = useState(false)
  const [flashWrongCell, setFlashWrongCell] = useState<{ row: number; col: number } | null>(null)
  const [lastCorrectCell, setLastCorrectCell] = useState<{ row: number; col: number } | null>(null)

  const lives = MAX_LIVES - state.mistakes

  // シングルタップ → ✕ を配置（ライフ消費なし）
  const placeCross = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    setState(prev => {
      const current = prev.current[row]?.[col] ?? 'empty'
      if (current === 'queen') return prev  // クイーンは消さない
      const next: CellState = current === 'empty' ? 'crossed' : 'empty'
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = next
      return { ...prev, current: newCurrent }
    })
  }, [isComplete, isGameOver])

  // ダブルタップ → ♕ を配置（ライフ消費あり）
  const placeQueen = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    setState(prev => {
      const current = prev.current[row]?.[col] ?? 'empty'
      const next: CellState = current === 'queen' ? 'empty' : 'queen'
      const move: QueensMove = { row, col, state: next }
      const result = validate(prev, move)
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = next
      const newMistakes = result.lifeLost ? prev.mistakes + 1 : prev.mistakes
      const newState = { ...prev, current: newCurrent, mistakes: newMistakes }

      if (result.isComplete) {
        setIsComplete(true)
        setLastCorrectCell({ row, col })
      } else if (result.lifeLost) {
        // 間違いクイーン: 赤フラッシュ後に自動削除
        setFlashWrongCell({ row, col })
        setTimeout(() => {
          setState(s => {
            const nc = s.current.map(r => [...r]) as CellState[][]
            if (nc[row]?.[col] === 'queen') nc[row][col] = 'empty'
            return { ...s, current: nc }
          })
          setFlashWrongCell(null)
        }, 600)
        if (newMistakes >= MAX_LIVES) setIsGameOver(true)
      } else if (next === 'queen') {
        // 正しいクイーン配置: アニメーション
        setLastCorrectCell({ row, col })
        setTimeout(() => setLastCorrectCell(null), 500)
      }

      return newState
    })
  }, [isComplete, isGameOver])

  // ドラッグ → ✕ を配置（ライフ消費なし）
  const dragCross = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    setState(prev => {
      const current = prev.current[row]?.[col] ?? 'empty'
      if (current !== 'empty') return prev
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = 'crossed'
      return { ...prev, current: newCurrent }
    })
  }, [isComplete, isGameOver])

  // ドラッグ → ✕ を削除（クイーンは変更しない）
  const dragRemoveCross = useCallback((row: number, col: number) => {
    if (isComplete || isGameOver) return
    setState(prev => {
      const current = prev.current[row]?.[col] ?? 'empty'
      if (current !== 'crossed') return prev
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = 'empty'
      return { ...prev, current: newCurrent }
    })
  }, [isComplete, isGameOver])

  const restart = useCallback(() => {
    const puzzle = generate(difficulty, Date.now())
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
    setIsGameOver(false)
  }, [difficulty])

  return { state, placeCross, placeQueen, dragCross, dragRemoveCross, lives, isComplete, isGameOver, restart, flashWrongCell, lastCorrectCell }
}
