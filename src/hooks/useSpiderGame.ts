import { useState, useCallback } from 'react'
import { generate, dealState, validate, isValidMoveUnit, removeCompleteSets } from '../engines/spider'
import { SpiderState, SpiderMove, SpiderPuzzle } from '../engines/spider/types'
import { Difficulty } from '../types/engine'

export type SpiderSelection = { col: number; cardIndex: number }

function applySpiderMove(state: SpiderState, move: SpiderMove): SpiderState {
  const ns: SpiderState = {
    tableau: state.tableau.map(col => col.map(c => ({ ...c }))),
    stock: state.stock.map(d => d.map(c => ({ ...c }))),
    foundation: state.foundation,
    completedSuits: [...state.completedSuits],
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

export function useSpiderGame(difficulty: Difficulty, seed?: number, options?: { dealWithEmpty?: boolean }) {
  const [puzzle] = useState<SpiderPuzzle>(() => generate(difficulty, seed ?? Date.now()))
  const [state, setState] = useState<SpiderState>(() => ({
    ...dealState(puzzle.seed, puzzle.suitCount),
    startedAt: Date.now(),
    elapsedSeconds: 0,
  }))
  const [selected, setSelected] = useState<SpiderSelection | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [history, setHistory] = useState<SpiderState[]>([])

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
      }
      setSelected(null)
      return
    }

    const card = column[cardIndex]
    if (!card || !card.faceUp) return
    const seq = column.slice(cardIndex)
    if (!isValidMoveUnit(seq)) return
    setSelected({ col, cardIndex })
  }, [state, selected, isComplete, commitState])

  const doubleTapCard = useCallback((col: number, cardIndex: number) => {
    if (isComplete) return
    const column = state.tableau[col]
    if (!column) return
    const card = column[cardIndex]
    if (!card?.faceUp) return

    // Priority 1: non-empty tableau columns
    for (let dst = 0; dst < state.tableau.length; dst++) {
      if (dst === col || state.tableau[dst].length === 0) continue
      const move: SpiderMove = { type: 'move', from: { col, cardIndex }, to: { col: dst } }
      if (validate(state, move).correct) {
        commitState(applySpiderMove(state, move))
        setSelected(null)
        return
      }
    }
    // Priority 2: empty columns
    for (let dst = 0; dst < state.tableau.length; dst++) {
      if (dst === col || state.tableau[dst].length > 0) continue
      const move: SpiderMove = { type: 'move', from: { col, cardIndex }, to: { col: dst } }
      if (validate(state, move).correct) {
        commitState(applySpiderMove(state, move))
        setSelected(null)
        return
      }
    }
  }, [state, isComplete, commitState])

  const directMove = useCallback((fromCol: number, fromCardIdx: number, toCol: number) => {
    if (isComplete) return
    const move: SpiderMove = {
      type: 'move',
      from: { col: fromCol, cardIndex: fromCardIdx },
      to: { col: toCol },
    }
    const r = validate(state, move)
    if (r.correct) {
      commitState(applySpiderMove(state, move))
      setSelected(null)
    }
  }, [state, isComplete, commitState])

  const deal = useCallback(() => {
    if (isComplete) return
    if (state.stock.length === 0) return
    const hasEmpty = state.tableau.some(col => col.length === 0)
    if (hasEmpty && !options?.dealWithEmpty) return
    const move: SpiderMove = { type: 'deal' }
    commitState(applySpiderMove(state, move))
    setSelected(null)
  }, [state, isComplete, commitState, options?.dealWithEmpty])

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
  }, [puzzle])

  return {
    puzzle,
    state,
    selected,
    isComplete,
    canUndo: history.length > 0,
    tapTableau,
    doubleTapCard,
    directMove,
    deal,
    undo,
    restart,
  }
}
