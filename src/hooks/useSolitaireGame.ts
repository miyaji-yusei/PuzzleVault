import { useState, useCallback, useMemo } from 'react'
import { generate, validate, dealState } from '../engines/solitaire'
import { SolitaireState, SolitaireMove, Suit } from '../engines/solitaire/types'
import { Difficulty } from '../types/engine'

const MAX_RESETS: Record<Difficulty, number> = {
  easy: 999,
  normal: 3,
  hard: 3,
  expert: 1,
}

export type SelectedCard =
  | { pile: 'tableau'; colIndex: number; cardIndex: number }
  | { pile: 'waste' }
  | { pile: 'foundation'; index: number }

function suitIndex(suit: Suit): number {
  const map: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 }
  return map[suit]
}

function applyMove(s: SolitaireState, move: SolitaireMove, drawMode: 1 | 3): SolitaireState {
  const ns: SolitaireState = {
    tableau: s.tableau.map(col => col.map(card => ({ ...card }))),
    foundation: s.foundation.map(f => f.map(card => ({ ...card }))),
    stock: s.stock.map(c => ({ ...c })),
    waste: s.waste.map(c => ({ ...c })),
    moves: s.moves + 1,
    score: s.score,
    stockResets: s.stockResets,
    startedAt: s.startedAt,
    elapsedSeconds: s.elapsedSeconds,
  }
  switch (move.type) {
    case 'stock-draw': {
      const n = Math.min(drawMode, ns.stock.length)
      for (let i = 0; i < n; i++) {
        const card = ns.stock.pop()
        if (card) ns.waste.push({ ...card, faceUp: true })
      }
      break
    }
    case 'stock-reset':
      ns.stock = [...ns.waste].reverse().map(c => ({ ...c, faceUp: false }))
      ns.waste = []
      ns.stockResets += 1
      ns.score = Math.max(0, ns.score - 100)
      break
    case 'tableau-to-foundation': {
      if (!move.from) break
      const col = ns.tableau[move.from.index]
      const card = col?.pop()
      if (card) {
        ns.foundation[suitIndex(card.suit)].push({ ...card, faceUp: true })
        ns.score += 10
        const top = col[col.length - 1]
        if (top && !top.faceUp) {
          col[col.length - 1] = { ...top, faceUp: true }
          ns.score += 5
        }
      }
      break
    }
    case 'waste-to-foundation': {
      const card = ns.waste.pop()
      if (card) {
        ns.foundation[suitIndex(card.suit)].push({ ...card, faceUp: true })
        ns.score += 10
      }
      break
    }
    case 'tableau-to-tableau': {
      if (!move.from || !move.to) break
      const src = ns.tableau[move.from.index]
      const dst = ns.tableau[move.to.index]
      const ci = move.from.cardIndex ?? src.length - 1
      const cards = src.splice(ci)
      dst.push(...cards)
      const top = src[src.length - 1]
      if (top && !top.faceUp) {
        src[src.length - 1] = { ...top, faceUp: true }
        ns.score += 5
      }
      break
    }
    case 'waste-to-tableau': {
      if (!move.to) break
      const card = ns.waste.pop()
      if (card) {
        ns.tableau[move.to.index].push({ ...card, faceUp: true })
        ns.score += 5
      }
      break
    }
    case 'foundation-to-tableau': {
      if (!move.from || !move.to) break
      const f = ns.foundation[move.from.index]
      const card = f?.pop()
      if (card) {
        ns.tableau[move.to.index].push({ ...card, faceUp: true })
        ns.score = Math.max(0, ns.score - 15)
      }
      break
    }
  }
  return ns
}

function hasValidMoves(s: SolitaireState, maxResets: number): boolean {
  if (s.stock.length > 0) return true
  if (s.stockResets < maxResets && s.waste.length > 0) return true

  if (s.waste.length > 0) {
    if (validate(s, { type: 'waste-to-foundation' }).correct) return true
    for (let i = 0; i < s.tableau.length; i++) {
      if (validate(s, { type: 'waste-to-tableau', to: { pile: 'tableau', index: i } }).correct) return true
    }
  }

  for (let col = 0; col < s.tableau.length; col++) {
    const tableauCol = s.tableau[col]
    if (tableauCol.length === 0) continue
    if (validate(s, { type: 'tableau-to-foundation', from: { pile: 'tableau', index: col } }).correct) return true
    for (let ci = 0; ci < tableauCol.length; ci++) {
      if (!tableauCol[ci].faceUp) continue
      for (let dst = 0; dst < s.tableau.length; dst++) {
        if (dst === col) continue
        if (validate(s, { type: 'tableau-to-tableau', from: { pile: 'tableau', index: col, cardIndex: ci }, to: { pile: 'tableau', index: dst } }).correct) return true
      }
    }
  }
  return false
}

function autoCompleteState(s: SolitaireState, drawMode: 1 | 3): SolitaireState {
  let current = s
  let changed = true
  while (changed) {
    changed = false
    if (current.waste.length > 0) {
      const move: SolitaireMove = { type: 'waste-to-foundation' }
      if (validate(current, move).correct) {
        current = applyMove(current, move, drawMode)
        changed = true
        continue
      }
    }
    for (let i = 0; i < current.tableau.length; i++) {
      if (current.tableau[i].length > 0) {
        const move: SolitaireMove = { type: 'tableau-to-foundation', from: { pile: 'tableau', index: i } }
        if (validate(current, move).correct) {
          current = applyMove(current, move, drawMode)
          changed = true
          break
        }
      }
    }
  }
  return current
}

export function useSolitaireGame(difficulty: Difficulty, seed?: number) {
  const [puzzle, setPuzzle] = useState(() => generate(difficulty, seed ?? Date.now()))
  const [state, setState] = useState<SolitaireState>(() => ({
    ...dealState(puzzle.seed, puzzle.drawMode),
    startedAt: Date.now(),
  }))
  const [selected, setSelected] = useState<SelectedCard | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [history, setHistory] = useState<SolitaireState[]>([])
  const maxResets = MAX_RESETS[difficulty]

  const canAutoComplete =
    !isComplete &&
    state.stock.length === 0 &&
    state.tableau.every(col => col.every(c => c.faceUp))

  const isDeadlocked = useMemo(
    () => !isComplete && !canAutoComplete && !hasValidMoves(state, maxResets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, isComplete, canAutoComplete, maxResets]
  )

  const commitState = useCallback((newState: SolitaireState) => {
    setHistory(prev => [...prev.slice(-30), state])
    setState(newState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const tapStock = useCallback(() => {
    setSelected(null)
    if (state.stock.length > 0) {
      const move: SolitaireMove = { type: 'stock-draw' }
      if (validate(state, move).correct) commitState(applyMove(state, move, puzzle.drawMode))
    } else if (state.stockResets < maxResets && state.waste.length > 0) {
      const move: SolitaireMove = { type: 'stock-reset' }
      if (validate(state, move).correct) commitState(applyMove(state, move, puzzle.drawMode))
    }
  }, [state, puzzle.drawMode, maxResets, commitState])

  const tapWaste = useCallback(() => {
    if (state.waste.length === 0) return
    setSelected(sel => sel?.pile === 'waste' ? null : { pile: 'waste' })
  }, [state.waste.length])

  const tapTableau = useCallback((colIndex: number, cardIndex?: number) => {
    const col = state.tableau[colIndex] ?? []
    const idx = cardIndex ?? col.length - 1

    if (selected) {
      let move: SolitaireMove
      if (selected.pile === 'waste') {
        move = { type: 'waste-to-tableau', to: { pile: 'tableau', index: colIndex } }
      } else if (selected.pile === 'foundation') {
        move = {
          type: 'foundation-to-tableau',
          from: { pile: 'foundation', index: selected.index },
          to: { pile: 'tableau', index: colIndex },
        }
      } else {
        if (selected.colIndex === colIndex) {
          setSelected(null)
          return
        }
        move = {
          type: 'tableau-to-tableau',
          from: { pile: 'tableau', index: selected.colIndex, cardIndex: selected.cardIndex },
          to: { pile: 'tableau', index: colIndex },
        }
      }
      const r = validate(state, move)
      if (r.correct) {
        commitState(applyMove(state, move, puzzle.drawMode))
        setSelected(null)
        if (r.isComplete) setIsComplete(true)
        return
      }
    }

    const card = col[idx]
    if (!card?.faceUp) {
      setSelected(null)
      return
    }

    setSelected({ pile: 'tableau', colIndex, cardIndex: idx })
  }, [state, selected, puzzle.drawMode, commitState])

  // Double-tap: auto-send top card to foundation
  const doubleTapCard = useCallback((colIndex: number) => {
    const move: SolitaireMove = { type: 'tableau-to-foundation', from: { pile: 'tableau', index: colIndex } }
    const r = validate(state, move)
    if (r.correct) {
      commitState(applyMove(state, move, puzzle.drawMode))
      setSelected(null)
      if (r.isComplete) setIsComplete(true)
    }
  }, [state, puzzle.drawMode, commitState])

  // Direct move for drag & drop
  const directMove = useCallback((move: SolitaireMove) => {
    const r = validate(state, move)
    if (r.correct) {
      commitState(applyMove(state, move, puzzle.drawMode))
      setSelected(null)
      if (r.isComplete) setIsComplete(true)
    }
  }, [state, puzzle.drawMode, commitState])

  // foundationIndex: which foundation pile was tapped (0=spades, 1=hearts, 2=diamonds, 3=clubs)
  const tapFoundation = useCallback((foundationIndex: number) => {
    if (selected) {
      let move: SolitaireMove
      if (selected.pile === 'waste') {
        move = { type: 'waste-to-foundation' }
      } else if (selected.pile === 'foundation') {
        setSelected(null)
        return
      } else {
        move = { type: 'tableau-to-foundation', from: { pile: 'tableau', index: selected.colIndex } }
      }
      const r = validate(state, move)
      if (r.correct) {
        commitState(applyMove(state, move, puzzle.drawMode))
        setSelected(null)
        if (r.isComplete) setIsComplete(true)
      } else {
        setSelected(null)
      }
      return
    }

    // No selection: select the foundation card for possible return to tableau
    const f = state.foundation[foundationIndex]
    if (f && f.length > 0) {
      setSelected({ pile: 'foundation', index: foundationIndex })
    }
  }, [state, selected, puzzle.drawMode, commitState])

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const prevState = next.pop()!
      setState(prevState)
      setSelected(null)
      return next
    })
  }, [])

  const restart = useCallback(() => {
    setState({
      ...dealState(puzzle.seed, puzzle.drawMode),
      startedAt: Date.now(),
    })
    setSelected(null)
    setIsComplete(false)
    setHistory([])
  }, [puzzle])

  const newGame = useCallback(() => {
    const freshPuzzle = generate(difficulty, Date.now())
    setPuzzle(freshPuzzle)
    setState({
      ...dealState(freshPuzzle.seed, freshPuzzle.drawMode),
      startedAt: Date.now(),
    })
    setSelected(null)
    setIsComplete(false)
    setHistory([])
  }, [difficulty])

  const autoComplete = useCallback(() => {
    const completed = autoCompleteState(state, puzzle.drawMode)
    setState(completed)
    setSelected(null)
    if (completed.foundation.every(f => f.length === 13)) setIsComplete(true)
  }, [state, puzzle.drawMode])

  return {
    state, puzzle, selected, isComplete, maxResets, canAutoComplete, isDeadlocked,
    tapStock, tapWaste, tapTableau, tapFoundation, doubleTapCard, directMove,
    undo, restart, newGame, autoComplete,
    canUndo: history.length > 0,
  }
}
