import { Difficulty } from '../../types/engine'
import { SpiderPuzzle } from './types'

const SUIT_COUNT: Record<Difficulty, 1 | 2 | 4> = {
  easy: 1,
  normal: 2,
  hard: 4,
  expert: 4,
}

// Pre-verified solvable seeds (confirmed by autoSolve(width=8, iter=8000) for 1-suit
// and autoSolve(width=8, iter=2000) for 2-suit).
// 60 seeds per difficulty gives enough variety that players rarely see repeats.
// Pool index = inputSeed % pool.length ensures same inputSeed → same puzzle
// (reproducibility) while O(1) generation time.
const SOLVABLE_SEEDS: Partial<Record<1 | 2 | 4, readonly number[]>> = {
  1: [
    4, 7, 17, 23, 24, 28, 35, 36, 48, 49, 82, 84, 95, 100, 117, 118,
    126, 128, 129, 132, 141, 142, 144, 145, 151, 174, 176, 181, 187, 192,
    195, 197, 202, 206, 215, 220, 222, 223, 224, 225, 226, 227, 228, 231,
    240, 242, 244, 247, 250, 251, 262, 264, 272, 276, 285, 293, 300, 305,
    306, 309,
  ],
  2: [
    47, 71, 87, 117, 139, 144, 193, 266, 309, 321, 331, 352, 356, 421,
    462, 489, 497, 508, 526, 541, 552, 553, 559, 576, 594, 603, 616, 627,
    629, 638, 737, 739, 791, 819, 822, 833, 860, 862, 868, 961, 988, 1036,
    1079, 1093, 1133, 1143, 1146, 1175, 1191, 1238, 1286, 1303, 1328,
    1339, 1396, 1418, 1419, 1445, 1507, 1521,
  ],
}

export function generate(difficulty: Difficulty, seed?: number): SpiderPuzzle {
  const baseSeed = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  const suitCount = SUIT_COUNT[difficulty]
  const pool = SOLVABLE_SEEDS[suitCount]

  if (pool && pool.length > 0) {
    const candidateSeed = pool[baseSeed % pool.length]!
    return {
      id: `spider-${difficulty}-${candidateSeed}`,
      seed: candidateSeed,
      suitCount,
      difficulty,
    }
  }

  return {
    id: `spider-${difficulty}-${baseSeed}`,
    seed: baseSeed,
    suitCount,
    difficulty,
  }
}
