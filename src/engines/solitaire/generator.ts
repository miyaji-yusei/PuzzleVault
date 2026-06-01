import { Difficulty } from '../../types/engine'
import { SolitairePuzzle } from './types'
import { dealState } from './state'
import { autoSolve } from './solver'

const DRAW_MODE: Record<Difficulty, 1 | 3> = {
  easy: 1,
  normal: 1,
  hard: 3,
  expert: 3,
}

const MAX_RESETS: Record<Difficulty, number> = {
  easy: 999,
  normal: 3,
  hard: 3,
  expert: 1,
}

export function generate(difficulty: Difficulty, seed?: number): SolitairePuzzle {
  const baseSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const drawMode = DRAW_MODE[difficulty]
  const maxResets = MAX_RESETS[difficulty]
  const maxAttempts = 500

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateSeed = (baseSeed + attempt) >>> 0
    const state = dealState(candidateSeed, drawMode)
    const solved = autoSolve(state, drawMode, maxResets, 1500)
    if (solved !== null) {
      return {
        id: `solitaire-${difficulty}-${candidateSeed}`,
        seed: candidateSeed,
        drawMode,
        difficulty,
      }
    }
  }

  return {
    id: `solitaire-${difficulty}-${baseSeed}`,
    seed: baseSeed,
    drawMode,
    difficulty,
  }
}
