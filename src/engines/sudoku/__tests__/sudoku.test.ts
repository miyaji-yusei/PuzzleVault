import { generate } from '../generator'
import { solve, countSolutions } from '../solver'
import { validate } from '../validator'
import { Board, Cell, SudokuPuzzle, SudokuState } from '../types'

jest.setTimeout(60000)

describe('Sudoku Engine', () => {
  describe('generate', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert'] as const

    for (const difficulty of difficulties) {
      describe(difficulty, () => {
        it('generates 10 solvable puzzles', () => {
          for (let i = 0; i < 10; i++) {
            const puzzle = generate(difficulty, 1000 + i)
            expect(puzzle.board).toBeDefined()
            expect(puzzle.solution).toBeDefined()
            expect(puzzle.difficulty).toBe(difficulty)

            const solved = solve(puzzle)
            expect(solved).not.toBeNull()
          }
        })
      })
    }

    it('same seed produces the same puzzle', () => {
      const p1 = generate('normal', 42)
      const p2 = generate('normal', 42)
      expect(p1.board).toEqual(p2.board)
      expect(p1.solution).toEqual(p2.solution)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 2)
      expect(p1.board).not.toEqual(p2.board)
    })

    it('generates within 500ms for easy', () => {
      const start = Date.now()
      generate('easy', 99999)
      expect(Date.now() - start).toBeLessThan(500)
    })

    it('generates within 500ms for normal', () => {
      const start = Date.now()
      generate('normal', 12345)
      expect(Date.now() - start).toBeLessThan(500)
    })

    it('puzzle board has correct number of givens for easy', () => {
      const puzzle = generate('easy', 7)
      const givens = puzzle.board.flat().filter(c => c !== null).length
      expect(givens).toBeGreaterThanOrEqual(40)
      expect(givens).toBeLessThanOrEqual(45)
    })

    it('puzzle board has correct number of givens for normal', () => {
      const puzzle = generate('normal', 8)
      const givens = puzzle.board.flat().filter(c => c !== null).length
      expect(givens).toBeGreaterThanOrEqual(32)
      expect(givens).toBeLessThanOrEqual(39)
    })
  })

  describe('solve', () => {
    it('solves a generated puzzle', () => {
      const puzzle = generate('easy', 1)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      // 全マスが埋まっている
      solved!.board.forEach(row => {
        row.forEach(cell => expect(cell).not.toBeNull())
      })
    })

    it('solved board matches solution field', () => {
      const puzzle = generate('normal', 2)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      expect(solved!.board).toEqual(puzzle.solution)
    })

    it('returns null for unsolvable puzzle', () => {
      // (0,0) が null、行0に2-9が存在、列0に1が存在 → (0,0) に置ける値がない
      const unsolvable: Board = Array.from({ length: 9 }, () =>
        Array(9).fill(null) as Cell[]
      )
      for (let c = 1; c < 9; c++) {
        unsolvable[0][c] = (c + 1) as Cell
      }
      unsolvable[1][0] = 1

      const puzzle: SudokuPuzzle = {
        id: 'test-unsolvable',
        board: unsolvable,
        solution: unsolvable,
        difficulty: 'easy',
        seed: 0,
      }
      expect(solve(puzzle)).toBeNull()
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for a generated puzzle', () => {
      const puzzle = generate('normal', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns more than 1 for an empty board', () => {
      const emptyBoard: Board = Array.from({ length: 9 }, () =>
        Array(9).fill(null) as Cell[]
      )
      const puzzle: SudokuPuzzle = {
        id: 'test-empty',
        board: emptyBoard,
        solution: emptyBoard,
        difficulty: 'easy',
        seed: 0,
      }
      expect(countSolutions(puzzle)).toBeGreaterThan(1)
    })
  })

  describe('validate', () => {
    const buildState = (puzzle: SudokuPuzzle): SudokuState => ({
      ...puzzle,
      current: puzzle.board.map(row => [...row] as Cell[]),
      notes: Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => Array(10).fill(false) as boolean[])
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })

    const findEmpty = (puzzle: SudokuPuzzle): [number, number] => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.board[r][c] === null) return [r, c]
        }
      }
      throw new Error('no empty cell')
    }

    it('returns correct=true for a correct move', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmpty(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, {
        row,
        col,
        value: puzzle.solution[row][col],
        isNote: false,
      })

      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('returns correct=false and lifeLost=true for a wrong move', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmpty(puzzle)
      const state = buildState(puzzle)

      const correctVal = puzzle.solution[row][col] as number
      const wrongVal = ((correctVal % 9) + 1) as Cell

      const result = validate(state, {
        row,
        col,
        value: wrongVal,
        isNote: false,
      })

      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(true)
    })

    it('note move never loses a life', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmpty(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, {
        row,
        col,
        value: 1,
        isNote: true,
      })

      expect(result.lifeLost).toBe(false)
      expect(result.isComplete).toBe(false)
    })

    it('detects puzzle completion', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      // 最後の空きマス以外をすべて正解で埋める
      let lastRow = -1
      let lastCol = -1
      let emptyCells = 0
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.board[r][c] === null) {
            emptyCells++
            lastRow = r
            lastCol = c
          }
        }
      }

      // current を solution で埋める（最後のマス以外）
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.board[r][c] === null && !(r === lastRow && c === lastCol)) {
            state.current[r][c] = puzzle.solution[r][c]
          }
        }
      }

      if (emptyCells === 0) return  // 空きなしのパズルはスキップ

      const result = validate(state, {
        row: lastRow,
        col: lastCol,
        value: puzzle.solution[lastRow][lastCol],
        isNote: false,
      })

      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
    })
  })
})
