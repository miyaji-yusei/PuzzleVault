import { useState, useCallback, useEffect } from 'react'
import { generate, validate, getPlayableCards, createInitialState } from '../engines/seven'
import { SevenState, SevenMove, SevenPuzzle, Card, Rank, Suit } from '../engines/seven/types'
import { Difficulty } from '../types/engine'

function applyMove(state: SevenState, move: SevenMove): SevenState {
  const player = state.currentPlayer
  const next: SevenState = {
    ...state,
    hands: state.hands.map(h => [...h]),
    field: {
      spades: { ...state.field.spades },
      hearts: { ...state.field.hearts },
      diamonds: { ...state.field.diamonds },
      clubs: { ...state.field.clubs },
    },
    passCount: [...state.passCount],
    finished: [...state.finished],
  }

  if (move.type === 'play' && move.card) {
    const { suit, rank } = move.card
    next.hands[player] = next.hands[player].filter(c => !(c.suit === suit && c.rank === rank))
    const f = next.field[suit]
    if (!f.started) {
      f.started = true
      f.min = 7 as Rank
      f.max = 7 as Rank
    } else if (rank < f.min) {
      f.min = rank
    } else {
      f.max = rank
    }
    if (next.hands[player].length === 0 && !next.finished.includes(player)) {
      next.finished.push(player)
    }
  } else if (move.type === 'pass') {
    next.passCount[player]++
  }

  const total = state.hands.length
  let nextPlayer = (player + 1) % total
  let tries = 0
  while (next.finished.includes(nextPlayer) && tries < total) {
    nextPlayer = (nextPlayer + 1) % total
    tries++
  }
  next.currentPlayer = nextPlayer
  return next
}

function chooseAiMove(state: SevenState, playerIdx: number): SevenMove {
  const playable = getPlayableCards(state, playerIdx)
  if (playable.length === 0) return { type: 'pass' }
  const sevens = playable.filter(c => c.rank === 7)
  if (sevens.length > 0) return { type: 'play', card: sevens[0] }
  const sorted = [...playable].sort((a, b) => Math.abs(a.rank - 7) - Math.abs(b.rank - 7))
  return { type: 'play', card: sorted[0] as Card }
}

type Game = { puzzle: SevenPuzzle; gameState: SevenState }

export function useSevenGame(difficulty: Difficulty, seed?: number) {
  const [game, setGame] = useState<Game>(() => {
    const puzzle = generate(difficulty, seed ?? Date.now())
    return {
      puzzle,
      gameState: { ...createInitialState(puzzle), startedAt: Date.now(), elapsedSeconds: 0 },
    }
  })
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [humanRank, setHumanRank] = useState<number | null>(null)

  const { puzzle, gameState: state } = game

  // Auto-play AI turns with delay
  useEffect(() => {
    if (isComplete || isGameOver) return
    const { currentPlayer, finished } = state
    if (currentPlayer === 0) return
    if (finished.includes(currentPlayer)) return

    const timer = setTimeout(() => {
      const aiMove = chooseAiMove(state, currentPlayer)
      const nextState = applyMove(state, aiMove)
      setGame(prev => ({ ...prev, gameState: nextState }))
      if (nextState.finished.length === nextState.hands.length) {
        setIsComplete(true)
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [state, isComplete, isGameOver])

  const selectCard = useCallback((card: Card) => {
    if (state.currentPlayer !== 0 || isComplete || isGameOver) return
    const playable = getPlayableCards(state, 0)
    const canPlay = playable.some(c => c.suit === card.suit && c.rank === card.rank)
    if (!canPlay) return
    setSelectedCard(prev =>
      prev?.suit === card.suit && prev?.rank === card.rank ? null : card
    )
  }, [state, isComplete, isGameOver])

  const playCard = useCallback(() => {
    if (!selectedCard || isComplete || isGameOver) return
    if (state.currentPlayer !== 0) return

    const move: SevenMove = { type: 'play', card: selectedCard }
    const result = validate(state, move)
    if (!result.correct) return

    const nextState = applyMove(state, move)
    setGame(prev => ({ ...prev, gameState: nextState }))
    setSelectedCard(null)

    if (nextState.finished.includes(0) && humanRank === null) {
      const rank = nextState.finished.indexOf(0) + 1
      setHumanRank(rank)
      setIsComplete(true)
    }
  }, [selectedCard, state, isComplete, isGameOver, humanRank])

  const pass = useCallback(() => {
    if (isComplete || isGameOver) return
    if (state.currentPlayer !== 0) return

    const newPassCount = state.passCount[0] + 1
    if (newPassCount > puzzle.passLimit) {
      setIsGameOver(true)
      return
    }

    const nextState = applyMove(state, { type: 'pass' })
    setGame(prev => ({ ...prev, gameState: nextState }))
    setSelectedCard(null)
  }, [state, isComplete, isGameOver, puzzle.passLimit])

  const restart = useCallback(() => {
    const newPuzzle = generate(difficulty, Date.now())
    setGame({
      puzzle: newPuzzle,
      gameState: { ...createInitialState(newPuzzle), startedAt: Date.now(), elapsedSeconds: 0 },
    })
    setSelectedCard(null)
    setIsComplete(false)
    setIsGameOver(false)
    setHumanRank(null)
  }, [difficulty])

  const playableCards = state.currentPlayer === 0 ? getPlayableCards(state, 0) : []
  const humanPassesLeft = puzzle.passLimit - state.passCount[0]
  const isHumanTurn = state.currentPlayer === 0 && !state.finished.includes(0) && !isComplete && !isGameOver

  return {
    state,
    puzzle,
    selectedCard,
    isComplete,
    isGameOver,
    humanRank,
    humanPassesLeft,
    playableCards,
    isHumanTurn,
    selectCard,
    playCard,
    pass,
    restart,
  }
}
