import { useCallback, useState } from 'react'
import { DrawSource, TUTORIAL_STEPS } from '../engines/seven'

/** Sevenの固定シナリオチュートリアルを1ステップずつ進行させる */
export function useSevenTutorial() {
  const [stepIndex, setStepIndex] = useState(0)

  const step = TUTORIAL_STEPS[stepIndex] as (typeof TUTORIAL_STEPS)[number]
  const totalSteps = TUTORIAL_STEPS.length
  const isFirst = stepIndex === 0
  const isLast = stepIndex === totalSteps - 1
  const canAdvanceManually = step.action === null

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1))
  }, [totalSteps])

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setStepIndex(0)
  }, [])

  // ハイライト中のランクのカードをタップしたら次のステップへ進む
  const handleSelectCard = useCallback(
    (index: number) => {
      const action = step.action
      if (action?.type !== 'select-rank') return
      const tapped = step.state.hands[0][index]
      if (tapped?.rank === action.rank) next()
    },
    [step, next],
  )

  // ハイライト中の山札/捨て札をタップしたら次のステップへ進む
  const handleDraw = useCallback(
    (source: DrawSource) => {
      const action = step.action
      if (action?.type === 'draw' && action.source === source) next()
    },
    [step, next],
  )

  return {
    step,
    stepIndex,
    totalSteps,
    isFirst,
    isLast,
    canAdvanceManually,
    next,
    prev,
    reset,
    handleSelectCard,
    handleDraw,
  }
}
