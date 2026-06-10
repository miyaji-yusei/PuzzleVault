import { useState, useCallback, useRef } from 'react'
import { generate, dealState, validate, isValidMoveUnit, removeCompleteSets } from '../engines/spider'
import { SpiderState, SpiderMove, SpiderPuzzle, Card, Rank } from '../engines/spider/types'
import { Difficulty } from '../types/engine'

export type SpiderSelection = { col: number; cardIndex: number }
export type CompletingSet = { col: number; cards: Card[] }

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
      // removeCompleteSets is intentionally deferred to enable animation
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

function findFirstCompletingSet(state: SpiderState): { col: number; startIdx: number } | null {
  for (let col = 0; col < 10; col++) {
    const column = state.tableau[col]!
    if (column.length < 13) continue
    const startIdx = column.length - 13
    const top = column[startIdx]!
    if (!top.faceUp || top.rank !== 13) continue
    const suit = top.suit
    let valid = true
    for (let i = 0; i < 13; i++) {
      const c = column[startIdx + i]!
      if (!c.faceUp || c.suit !== suit || c.rank !== (13 - i) as Rank) {
        valid = false
        break
      }
    }
    if (valid) return { col, startIdx }
  }
  return null
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
  const [completingSet, setCompletingSet] = useState<CompletingSet | null>(null)
  const pendingStateRef = useRef<SpiderState | null>(null)

  const commitState = useCallback((ns: SpiderState) => {
    const completing = findFirstCompletingSet(ns)
    setHistory(prev => [...prev.slice(-30), state])
    if (completing) {
      const cards = ns.tableau[completing.col]!.slice(completing.startIdx).map(c => ({ ...c }))
      pendingStateRef.current = ns
      setCompletingSet({ col: completing.col, cards })
      setState(ns)
    } else {
      pendingStateRef.current = null
      setCompletingSet(null)
      setState(ns)
      if (ns.foundation === 8) setIsComplete(true)
    }
  }, [state])

  const onSetAnimationDone = useCallback(() => {
    const pending = pendingStateRef.current
    if (!pending) return
    const finalState: SpiderState = {
      tableau: pending.tableau.map(col => col.slice()),
      stock: pending.stock.map(d => d.slice()),
      foundation: pending.foundation,
      completedSuits: [...pending.completedSuits],
      moves: pending.moves,
      startedAt: pending.startedAt,
      elapsedSeconds: pending.elapsedSeconds,
    }
    removeCompleteSets(finalState)
    pendingStateRef.current = null
    setCompletingSet(null)
    setState(finalState)
    if (finalState.foundation === 8) setIsComplete(true)
  }, [])

  const tapTableau = useCallback((col: number, cardIndex: number) => {
    if (isComplete || completingSet !== null) return
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
  }, [state, selected, isComplete, commitState, completingSet])

  const doubleTapCard = useCallback((col: number, cardIndex: number) => {
    if (isComplete || completingSet !== null) return
    const column = state.tableau[col]
    if (!column) return
    const card = column[cardIndex]
    if (!card?.faceUp) return

    for (let dst = 0; dst < state.tableau.length; dst++) {
      if (dst === col || state.tableau[dst].length === 0) continue
      const move: SpiderMove = { type: 'move', from: { col, cardIndex }, to: { col: dst } }
      if (validate(state, move).correct) {
        commitState(applySpiderMove(state, move))
        setSelected(null)
        return
      }
    }
    for (let dst = 0; dst < state.tableau.length; dst++) {
      if (dst === col || state.tableau[dst].length > 0) continue
      const move: SpiderMove = { type: 'move', from: { col, cardIndex }, to: { col: dst } }
      if (validate(state, move).correct) {
        commitState(applySpiderMove(state, move))
        setSelected(null)
        return
      }
    }
  }, [state, isComplete, commitState, completingSet])

  const directMove = useCallback((fromCol: number, fromCardIdx: number, toCol: number) => {
    if (isComplete || completingSet !== null) return
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
  }, [state, isComplete, commitState, completingSet])

  const deal = useCallback(() => {
    if (isComplete || completingSet !== null) return
    if (state.stock.length === 0) return
    const hasEmpty = state.tableau.some(col => col.length === 0)
    if (hasEmpty && !options?.dealWithEmpty) return
    const move: SpiderMove = { type: 'deal' }
    commitState(applySpiderMove(state, move))
    setSelected(null)
  }, [state, isComplete, commitState, completingSet, options?.dealWithEmpty])

  const undo = useCallback(() => {
    if (completingSet !== null) return
    setHistory(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const prevState = next.pop()!
      setState(prevState)
      setSelected(null)
      setIsComplete(false)
      return next
    })
  }, [completingSet])

  const restart = useCallback(() => {
    pendingStateRef.current = null
    setCompletingSet(null)
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
    completingSet,
    onSetAnimationDone,
  }
}
