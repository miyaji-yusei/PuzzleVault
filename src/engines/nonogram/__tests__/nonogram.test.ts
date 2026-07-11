import { generate } from '../generator'
import { solve, countSolutions, solveLine } from '../solver'
import { validate } from '../validator'
import { NonogramPuzzle, NonogramState, CellState } from '../types'

jest.setTimeout(120000)

describe('Nonogram Engine', () => {
  describe('generate', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert'] as const

    for (const difficulty of difficulties) {
      describe(difficulty, () => {
        it('generates 10 solvable puzzles', () => {
          for (let i = 0; i < 10; i++) {
            const puzzle = generate(difficulty, 1000 + i)
            expect(puzzle.rowClues).toBeDefined()
            expect(puzzle.colClues).toBeDefined()
            expect(puzzle.solution).toBeDefined()
            expect(puzzle.difficulty).toBe(difficulty)
            expect(puzzle.size).toBeGreaterThan(0)

            const solved = solve(puzzle)
            expect(solved).not.toBeNull()
          }
        })
      })
    }

    it('same seed produces the same puzzle', () => {
      const p1 = generate('normal', 42)
      const p2 = generate('normal', 42)
      expect(p1.rowClues).toEqual(p2.rowClues)
      expect(p1.colClues).toEqual(p2.colClues)
      expect(p1.solution).toEqual(p2.solution)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 2)
      expect(p1.solution).not.toEqual(p2.solution)
    })

    it('easy puzzle has size 10', () => {
      const puzzle = generate('easy', 7)
      expect(puzzle.size).toBe(10)
    })

    it('normal puzzle has size 15', () => {
      const puzzle = generate('normal', 7)
      expect(puzzle.size).toBe(15)
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

    it('rowClues length matches size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.rowClues.length).toBe(puzzle.size)
    })

    it('colClues length matches size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.colClues.length).toBe(puzzle.size)
    })

    it('solution dimensions match size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.solution.length).toBe(puzzle.size)
      puzzle.solution.forEach(row => expect(row.length).toBe(puzzle.size))
    })
  })

  describe('solveLine', () => {
    it('solves a simple line', () => {
      // size=5, clue=[3]: 塗り3の確定マス (index 1,2,3)
      const result = solveLine([3], 5, [null, null, null, null, null])
      expect(result[2]).toBe(true) // 中央は必ず塗り
    })

    it('all empty for clue [0]', () => {
      const result = solveLine([0], 5, Array(5).fill(null))
      expect(result.every(v => v === false)).toBe(true)
    })

    it('full fill for clue equal to size', () => {
      const result = solveLine([5], 5, Array(5).fill(null))
      expect(result.every(v => v === true)).toBe(true)
    })
  })

  describe('solve', () => {
    it('solves a generated easy puzzle', () => {
      const puzzle = generate('easy', 1)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      solved!.solution.forEach(row => {
        row.forEach(cell => expect(typeof cell).toBe('boolean'))
      })
    })

    it('solved solution matches expected solution', () => {
      const puzzle = generate('easy', 2)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      expect(solved!.solution).toEqual(puzzle.solution)
    })

    it('returns null for unsolvable clues', () => {
      const unsolvable: NonogramPuzzle = {
        id: 'test',
        size: 3,
        // 矛盾したヒント: 行は全て[3]、列は全て[0]
        rowClues: [[3], [3], [3]],
        colClues: [[0], [0], [0]],
        solution: [[true, true, true], [true, true, true], [true, true, true]],
        difficulty: 'easy',
        seed: 0,
      }
      expect(solve(unsolvable)).toBeNull()
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for a uniquely solvable puzzle', () => {
      const puzzle = generate('normal', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns more than 1 for ambiguous puzzle', () => {
      // 全行全列に [0] → 全空白で一意だが矛盾のないパターン
      // 代わりに2行2列でどちらにでも塗れるパターンを作る
      const ambiguous: NonogramPuzzle = {
        id: 'test-ambiguous',
        size: 2,
        rowClues: [[1], [1]],
        colClues: [[1], [1]],
        solution: [[true, false], [false, true]],
        difficulty: 'easy',
        seed: 0,
      }
      expect(countSolutions(ambiguous)).toBeGreaterThan(1)
    })
  })

  describe('validate', () => {
    const buildState = (puzzle: NonogramPuzzle): NonogramState => ({
      ...puzzle,
      current: Array.from({ length: puzzle.size }, () =>
        Array(puzzle.size).fill('empty') as CellState[]
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })

    it('correct filled move returns correct=true, lifeLost=false', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      // 塗るべきセルを探す
      let targetRow = -1, targetCol = -1
      outer: for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c]) { targetRow = r; targetCol = c; break outer }
        }
      }

      if (targetRow === -1) return

      const result = validate(state, { row: targetRow, col: targetCol, state: 'filled' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('wrong filled move returns correct=false, lifeLost=true', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      let targetRow = -1, targetCol = -1
      outer: for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (!puzzle.solution[r][c]) { targetRow = r; targetCol = c; break outer }
        }
      }

      if (targetRow === -1) return

      const result = validate(state, { row: targetRow, col: targetCol, state: 'filled' })
      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(true)
    })

    it('correct crossed move returns correct=true, lifeLost=false', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      let targetRow = -1, targetCol = -1
      outer: for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (!puzzle.solution[r][c]) { targetRow = r; targetCol = c; break outer }
        }
      }

      if (targetRow === -1) return

      const result = validate(state, { row: targetRow, col: targetCol, state: 'crossed' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('detects puzzle completion', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      // solutionに基づいて全マスをcurrentに反映（最後の1マス以外）
      let lastRow = -1, lastCol = -1
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c]) { lastRow = r; lastCol = c }
        }
      }

      if (lastRow === -1) return

      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (!(r === lastRow && c === lastCol)) {
            state.current[r][c] = puzzle.solution[r][c] ? 'filled' : 'empty'
          }
        }
      }

      const result = validate(state, { row: lastRow, col: lastCol, state: 'filled' })
      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
    })
  })
})
