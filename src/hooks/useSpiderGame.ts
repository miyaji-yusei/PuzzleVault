import { useState, useCallback } from 'react'
import { generate, dealState, validate, removeCompleteSets } from '../engines/spider'
import { SpiderState, SpiderMove, SpiderPuzzle } from '../engines/spider/types'
import { Difficulty } from '../types/engine'

const MAX_LIVES: Record<Difficulty, number | null> = {
  easy: null,
  normal: 5,
  hard: 3,
  expert: 3,
}

export type SpiderSelection = { col: number; cardIndex: number }

function applySpiderMove(state: SpiderState, move: SpiderMove): SpiderState {
  const ns: SpiderState = {
    tableau: state.tableau.map(col => col.map(c => ({ ...c }))),
    stock: state.stock.map(d => d.map(c => ({ ...c }))),
    foundation: state.foundation,
    moves: state.moves + 1,
    startedAt: state.startedAt,
    elapsedSeconds: state.elapsedSeconds,
  }

  if (move.type === 'move' && move.from && move.to !== undefined) {
    const { col: fromCol, cardIndex: fromIdx } = move.from
    const { col: toCol } = move.to
    const srcCol = ns.tableau[fromCol]
    const dstCol = ns.tableau[toCol]
    if (srcCol && dstCol) {
      const moving = srcCol.splice(fromIdx)
      dstCol.push(...moving)
      const top = srcCol[srcCol.length - 1]
      if (top && !top.faceUp) {
        srcCol[srcCol.length - 1] = { ...top, faceUp: true }
      }
      removeCompleteSets(ns)
    }
  } else if (move.type === 'deal') {
    const deal = ns.stock.pop()
    if (deal) {
      for (let col = 0; col < 10; col++) {
        const card = deal[col]
        if (card) ns.tableau[col].push({ ...card, faceUp: true })
      }
    }
  }

  return ns
}

export function useSpiderGame(difficulty: Difficulty, seed?: number) {
  const [puzzle] = useState<SpiderPuzzle>(() => generate(difficulty, seed ?? Date.now()))
  const [state, setState] = useState<SpiderState>(() => ({
    ...dealState(puzzle.seed, puzzle.suitCount),
    startedAt: Date.now(),
    elapsedSeconds: 0,
  }))
  const [selected, setSelected] = useState<SpiderSelection | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [history, setHistory] = useState<SpiderState[]>([])
  const [lives, setLives] = useState<number | null>(MAX_LIVES[difficulty])

  const commitState = useCallback((ns: SpiderState) => {
    setHistory(prev => [...prev.slice(-30), state])
    setState(ns)
    if (ns.foundation === 8) setIsComplete(true)
  }, [state])

  const tapTableau = useCallback((col: number, cardIndex: number) => {
    if (isComplete) return
    const column = state.tableau[col]
    if (!column) return

    if (selected) {
      if (selected.col === col) {
        setSelected(null)
        return
      }
      const move: SpiderMove = {
        type: 'move',
        from: { col: selected.col, cardIndex: selected.cardIndex },
        to: { col },
      }
      const result = validate(state, move)
      if (result.correct) {
        commitState(applySpiderMove(state, move))
      } else if (result.lifeLost) {
        setLives(prev => (prev === null ? null : Math.max(0, prev - 1)))
      }
      setSelected(null)
      return
    }

    const card = column[cardIndex]
    if (!card || !card.faceUp) return
    setSelected({ col, cardIndex })
  }, [state, selected, isComplete, commitState])

  const deal = useCallback(() => {
    if (isComplete) return
    const move: SpiderMove = { type: 'deal' }
    const result = validate(state, move)
    if (!result.correct) return
    commitState(applySpiderMove(state, move))
    setSelected(null)
  }, [state, isComplete, commitState])

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const prevState = next.pop()!
      setState(prevState)
      setSelected(null)
      setIsComplete(false)
      return next
    })
  }, [])

  const restart = useCallback(() => {
    setState({
      ...dealState(puzzle.seed, puzzle.suitCount),
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })
    setSelected(null)
    setIsComplete(false)
    setHistory([])
    setLives(MAX_LIVES[difficulty])
  }, [puzzle, difficulty])

  return {
    puzzle,
    state,
    selected,
    isComplete,
    isGameOver: lives !== null && lives <= 0,
    lives,
    canUndo: history.length > 0,
    tapTableau,
    deal,
    undo,
    restart,
  }
}
