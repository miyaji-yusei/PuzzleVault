import { Difficulty } from '../../types/engine'
import { SpiderPuzzle } from './types'
import { dealState } from './state'
import { autoSolve } from './solver'

const SUIT_COUNT: Record<Difficulty, 1 | 2 | 4> = {
  easy: 1,
  normal: 2,
  hard: 4,
  expert: 4,
}

const MAX_ATTEMPTS: Record<Difficulty, number> = {
  easy: 300,
  normal: 50,
  hard: 0,
  expert: 0,
}

const SOLVER_ITERS: Record<Difficulty, number> = {
  easy: 3000,
  normal: 1500,
  hard: 0,
  expert: 0,
}

export function generate(difficulty: Difficulty, seed?: number): SpiderPuzzle {
  const baseSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const suitCount = SUIT_COUNT[difficulty]
  const maxAttempts = MAX_ATTEMPTS[difficulty]

  if (maxAttempts > 0) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateSeed = (baseSeed + attempt) >>> 0
      const state = dealState(candidateSeed, suitCount)
      const solved = autoSolve(state, suitCount, SOLVER_ITERS[difficulty])
      if (solved !== null) {
        return {
          id: `spider-${difficulty}-${candidateSeed}`,
          seed: candidateSeed,
          suitCount,
          difficulty,
        }
      }
    }
  }

  return {
    id: `spider-${difficulty}-${baseSeed}`,
    seed: baseSeed,
    suitCount,
    difficulty,
  }
}
