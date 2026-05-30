// 共通型定義 - 全ゲームエンジンで使用

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

export interface ValidationResult {
  correct: boolean
  isComplete: boolean
  lifeLost: boolean
}

export interface PuzzleGenerator<T> {
  generate(difficulty: Difficulty, seed?: number): T
}

export interface PuzzleSolver<T> {
  solve(puzzle: T): T | null
  countSolutions(puzzle: T): number
}

export interface MoveValidator<T, M> {
  validate(state: T, move: M): ValidationResult
}
