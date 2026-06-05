import { useState, useCallback, useEffect, useRef } from 'react'
import { generate } from '../engines/nonogram'
import { NonogramState, CellState } from '../engines/nonogram/types'
import { Difficulty } from '../types/engine'

export type NonogramMode = 'fill' | 'cross'
export type HintColor = 'default' | 'blue' | 'red'

function getFilledGroups(line: CellState[]): number[] {
  const groups: number[] = []
  let count = 0
  for (const cell of line) {
    if (cell === 'filled') {
      count++
    } else {
      if (count > 0) { groups.push(count); count = 0 }
    }
  }
  if (count > 0) groups.push(count)
  return groups
}

function isLineComplete(line: CellState[], hints: number[]): boolean {
  if (hints.length === 0) return line.every(c => c !== 'filled')
  const groups = getFilledGroups(line)
  return groups.length === hints.length && groups.every((g, i) => g === hints[i])
}

function computeAutoCrossed(
  current: CellState[][],
  size: number,
  rowClues: number[][],
  colClues: number[][]
): boolean[][] {
  const auto: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  for (let r = 0; r < size; r++) {
    const row = current[r] ?? []
    if (isLineComplete(row, rowClues[r] ?? [])) {
      for (let c = 0; c < size; c++) {
        if ((row[c] ?? 'empty') === 'empty') auto[r][c] = true
      }
    }
  }
  for (let c = 0; c < size; c++) {
    const col = Array.from({ length: size }, (_, r) => current[r]?.[c] ?? 'empty' as CellState)
    if (isLineComplete(col, colClues[c] ?? [])) {
      for (let r = 0; r < size; r++) {
        if ((current[r]?.[c] ?? 'empty') === 'empty') auto[r][c] = true
      }
    }
  }
  return auto
}

function computeLineHintColors(line: CellState[], hints: number[]): HintColor[] {
  const colors: HintColor[] = hints.map(() => 'default' as HintColor)
  if (hints.length === 0) return colors

  const groups: { len: number; closed: boolean }[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === 'filled') {
      const start = i
      while (i < line.length && line[i] === 'filled') i++
      const leftClosed = start === 0 || line[start - 1] === 'crossed'
      const rightClosed = i === line.length || line[i] === 'crossed'
      groups.push({ len: i - start, closed: leftClosed && rightClosed })
    } else {
      i++
    }
  }

  if (groups.length === hints.length && groups.every((g, idx) => g.len === hints[idx])) {
    return hints.map(() => 'blue' as HintColor)
  }

  let hintIdx = 0
  for (const g of groups) {
    if (hintIdx >= hints.length) {
      colors[hints.length - 1] = 'red'
      break
    }
    const hint = hints[hintIdx] ?? 0
    if (g.len > hint) {
      colors[hintIdx] = 'red'
      hintIdx++
    } else if (g.closed && g.len === hint) {
      colors[hintIdx] = 'blue'
      hintIdx++
    }
  }

  return colors
}

function computeAllClueColors(
  current: CellState[][],
  size: number,
  rowClues: number[][],
  colClues: number[][]
): { rowColors: HintColor[][]; colColors: HintColor[][] } {
  const rowColors = rowClues.map((hints, r) =>
    computeLineHintColors(current[r] ?? [], hints)
  )
  const colColors = colClues.map((hints, c) => {
    const col = Array.from({ length: size }, (_, r) => current[r]?.[c] ?? 'empty' as CellState)
    return computeLineHintColors(col, hints)
  })
  return { rowColors, colColors }
}

function makeInitialState(puzzle: ReturnType<typeof generate>): NonogramState {
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
}

export function useNonogramGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<NonogramState>(() => makeInitialState(generate(difficulty, seed)))
  const [isComplete, setIsComplete] = useState(false)
  const [mode, setMode] = useState<NonogramMode>('fill')
  const [autoCrossed, setAutoCrossed] = useState<boolean[][]>(() =>
    Array.from({ length: state.size }, () => Array(state.size).fill(false))
  )

  const prevDifficultyRef = useRef<Difficulty | null>(null)
  useEffect(() => {
    if (prevDifficultyRef.current !== null && prevDifficultyRef.current !== difficulty) {
      const puzzle = generate(difficulty)
      const s = makeInitialState(puzzle)
      setState(s)
      setIsComplete(false)
      setMode('fill')
      setAutoCrossed(Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(false)))
    }
    prevDifficultyRef.current = difficulty
  }, [difficulty])

  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const scheduleAutoX = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = setTimeout(() => {
      const s = stateRef.current
      setAutoCrossed(computeAutoCrossed(s.current, s.size, s.rowClues, s.colClues))
    }, 1000)
  }, [])

  const checkComplete = (solution: boolean[][], current: CellState[][]): boolean =>
    solution.every((sRow, r) => sRow.every((sol, c) => sol === (current[r]?.[c] === 'filled')))

  const setCell = useCallback((row: number, col: number) => {
    if (isComplete) return
    setState(prev => {
      const nextCell: CellState = mode === 'fill' ? 'filled' : 'crossed'
      if ((prev.current[row]?.[col] ?? 'empty') === nextCell) return prev
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = nextCell
      if (checkComplete(prev.solution, newCurrent)) setIsComplete(true)
      return { ...prev, current: newCurrent }
    })
    scheduleAutoX()
  }, [isComplete, mode, scheduleAutoX])

  const setCellTo = useCallback((row: number, col: number, target: CellState) => {
    if (isComplete) return
    setState(prev => {
      if ((prev.current[row]?.[col] ?? 'empty') === target) return prev
      const newCurrent = prev.current.map(r => [...r]) as CellState[][]
      newCurrent[row][col] = target
      if (target === 'filled' && checkComplete(prev.solution, newCurrent)) setIsComplete(true)
      return { ...prev, current: newCurrent }
    })
    scheduleAutoX()
  }, [isComplete, scheduleAutoX])

  const restart = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    const puzzle = generate(difficulty)
    const s = makeInitialState(puzzle)
    setState(s)
    setIsComplete(false)
    setAutoCrossed(Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(false)))
  }, [difficulty])

  const { rowColors, colColors } = computeAllClueColors(state.current, state.size, state.rowClues, state.colClues)

  return { state, setCell, setCellTo, mode, setMode, isComplete, restart, autoCrossed, rowClueColors: rowColors, colClueColors: colColors }
}
