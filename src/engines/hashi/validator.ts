import { HashiState, HashiMove } from './types'
import { ValidationResult } from '../../types/engine'
import { findPotentialEdges } from './solver'

export function validate(state: HashiState, move: HashiMove): ValidationResult {
  const { fromIslandId, toIslandId, action } = move
  const edges = findPotentialEdges(state.islands)
  const edgeKey = `${Math.min(fromIslandId, toIslandId)}-${Math.max(fromIslandId, toIslandId)}`
  const validEdge = edges.some(([a, b]) =>
    `${Math.min(a,b)}-${Math.max(a,b)}` === edgeKey
  )
  if (!validEdge) return { correct: false, isComplete: false, lifeLost: true }
  const solutionBridge = state.solution.find(
    b => (b.from === fromIslandId && b.to === toIslandId) ||
         (b.from === toIslandId && b.to === fromIslandId)
  )
  if (action === 'remove') {
    return { correct: true, isComplete: false, lifeLost: false }
  }
  const currentBridge = state.current.find(
    b => (b.from === fromIslandId && b.to === toIslandId) ||
         (b.from === toIslandId && b.to === fromIslandId)
  )
  const currentCount = currentBridge?.count ?? 0
  const solutionCount = solutionBridge?.count ?? 0
  if (currentCount >= solutionCount) {
    return { correct: false, isComplete: false, lifeLost: true }
  }
  const newCurrent = [
    ...state.current.filter(b =>
      !((b.from === fromIslandId && b.to === toIslandId) ||
        (b.from === toIslandId && b.to === fromIslandId))
    ),
    { from: fromIslandId, to: toIslandId, count: (currentCount + 1) as 1 | 2 },
  ]
  const isComplete = state.solution.every(sb => {
    const cb = newCurrent.find(b =>
      (b.from === sb.from && b.to === sb.to) ||
      (b.from === sb.to && b.to === sb.from)
    )
    return cb?.count === sb.count
  })
  return { correct: true, isComplete, lifeLost: false }
}
