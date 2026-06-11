import { useCallback, useEffect, useState } from 'react'
import { applyLead, chooseMove, createInitialState, getLegalLeadMoves, getTeamScore, teamOf } from '../engines/goita'
import { Difficulty, GoitaState, Piece } from '../engines/goita/types'

export const HUMAN_PLAYER = 0
const AI_DELAY_MS = 700

export interface LeadInfo {
  leader: number
  piece: Piece
  capturedBy: number | null
  emptiedHand: boolean
}

// leaderがhandIndexの駒を出した結果(next)から、誰が取ったか(取れなければnull)を判定する
function describeLead(prev: GoitaState, handIndex: number, next: GoitaState): LeadInfo {
  const leader = prev.currentPlayer
  const piece = prev.hands[leader][handIndex]
  const emptiedHand = next.finished && next.currentPlayer === leader && next.hands[leader].length === 0
  const capturedBy = !emptiedHand && next.currentPlayer !== leader ? next.currentPlayer : null
  return { leader, piece, capturedBy, emptiedHand }
}

export function useGoitaGame(difficulty: Difficulty, seed?: number) {
  const [state, setState] = useState<GoitaState>(() => createInitialState(seed ?? Date.now()))
  const [lastPlay, setLastPlay] = useState<LeadInfo | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  const isHumanTurn = !state.finished && state.currentPlayer === HUMAN_PLAYER

  // 自分の手札からhandIndexの駒を出す
  const playPiece = useCallback((handIndex: number) => {
    setState((prev) => {
      if (prev.finished || prev.currentPlayer !== HUMAN_PLAYER) return prev
      if (!prev.hands[HUMAN_PLAYER][handIndex]) return prev
      const next = applyLead(prev, handIndex)
      setLastPlay(describeLead(prev, handIndex, next))
      return next
    })
    setSelected(null)
  }, [])

  // 自分の手札の駒を選択(ハイライト)/選択解除する
  const select = useCallback(
    (index: number) => {
      if (!isHumanTurn) return
      setSelected((prev) => (prev === index ? null : index))
    },
    [isHumanTurn]
  )

  // AIの手番を自動進行する
  useEffect(() => {
    if (state.finished || state.currentPlayer === HUMAN_PLAYER) return

    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.finished || prev.currentPlayer === HUMAN_PLAYER) return prev
        const handIndex = chooseMove(prev, difficulty)
        const next = applyLead(prev, handIndex)
        setLastPlay(describeLead(prev, handIndex, next))
        return next
      })
    }, AI_DELAY_MS)

    return () => clearTimeout(timer)
  }, [state, difficulty])

  const restart = useCallback(() => {
    setState(createInitialState(Date.now()))
    setLastPlay(null)
    setSelected(null)
  }, [])

  const myTeam = teamOf(state, HUMAN_PLAYER)
  const opponentTeam = 1 - myTeam

  return {
    state,
    selected,
    select,
    playPiece,
    restart,
    lastPlay,
    isHumanTurn,
    legalMoves: isHumanTurn ? getLegalLeadMoves(state) : [],
    myScore: getTeamScore(state, myTeam),
    opponentScore: getTeamScore(state, opponentTeam),
    isWin: state.finished && state.winningTeam === myTeam,
    isLose: state.finished && state.winningTeam !== null && state.winningTeam !== myTeam,
  }
}
