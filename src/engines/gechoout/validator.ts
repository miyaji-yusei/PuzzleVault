import { applyMove, canApplyMove } from './physics'
import { ValidationResult } from '../../types/engine'
import { GechoOutMove, GechoOutState } from './types'

// 手の合否を判定する。盤外・障害物・他の蛇との衝突は不正な手として扱う。
// このゲームにライフ制は無いため lifeLost は常にfalse
export function validate(state: GechoOutState, move: GechoOutMove): ValidationResult {
  if (!canApplyMove(state, move)) {
    return { correct: false, isComplete: false, lifeLost: false }
  }

  const next = applyMove(state, move)
  return {
    correct: true,
    isComplete: next.current.length === 0,
    lifeLost: false,
  }
}
