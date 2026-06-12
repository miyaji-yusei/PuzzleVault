import { useCallback, useEffect, useState } from 'react'
import { applyDiscardAndDraw, canDiscard, chooseMove, createInitialState } from '../engines/seven'
import { DrawSource, Difficulty, SevenState } from '../engines/seven'

export const HUMAN_PLAYER = 0
const AI_TURN_DELAY_MS = 1500

export function useSevenGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<SevenState>(() => createInitialState(seed ?? Date.now()))
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  const isHumanTurn = state.phase === 'playing' && state.currentPlayer === HUMAN_PLAYER

  // 同ランクのカードをタップしてグループ単位で選択/解除する
  const selectCard = useCallback((index: number) => {
    if (!isHumanTurn) return
    const hand = state.hands[HUMAN_PLAYER]
    const card = hand[index]
    if (!card) return

    setSelectedIndices((prev) => {
      if (prev.includes(index)) return []
      return hand.reduce<number[]>((acc, c, i) => (c.rank === card.rank ? [...acc, i] : acc), [])
    })
  }, [state, isHumanTurn])

  // 選択中のカードを捨て、山札または捨て札から1枚引く
  const drawFrom = useCallback((source: DrawSource) => {
    if (!isHumanTurn) return
    if (!canDiscard(state.hands[HUMAN_PLAYER], selectedIndices)) return

    setState((prev) => applyDiscardAndDraw(prev, selectedIndices, source))
    setSelectedIndices([])
  }, [state, selectedIndices, isHumanTurn])

  // AIの手番を自動進行する
  useEffect(() => {
    if (state.phase === 'finished' || state.currentPlayer === HUMAN_PLAYER) return

    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.phase === 'finished' || prev.currentPlayer === HUMAN_PLAYER) return prev
        const move = chooseMove(prev, difficulty)
        return applyDiscardAndDraw(prev, move.indices, move.source)
      })
    }, AI_TURN_DELAY_MS)

    return () => clearTimeout(timer)
  }, [state, difficulty])

  const restart = useCallback(() => {
    setState(createInitialState(Date.now()))
    setSelectedIndices([])
  }, [])

  return {
    state,
    selectedIndices,
    isHumanTurn,
    selectCard,
    drawFrom,
    restart,
  }
}
