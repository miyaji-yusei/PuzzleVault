import { generate } from '../generator'
import { solve, countSolutions } from '../solver'
import { validate } from '../validator'
import { PandaPuzzle, PandaState, CellContent } from '../types'

jest.setTimeout(120000)

describe('Panda Engine', () => {
  describe('generate', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert'] as const

    for (const difficulty of difficulties) {
      describe(difficulty, () => {
        it('generates 10 solvable puzzles', () => {
          for (let i = 0; i < 10; i++) {
            const puzzle = generate(difficulty, 1000 + i)
            expect(puzzle.fixed).toBeDefined()
            expect(puzzle.solution).toBeDefined()
            expect(puzzle.rowCounts).toBeDefined()
            expect(puzzle.colCounts).toBeDefined()
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
      expect(p1.fixed).toEqual(p2.fixed)
      expect(p1.solution).toEqual(p2.solution)
      expect(p1.rowCounts).toEqual(p2.rowCounts)
      expect(p1.colCounts).toEqual(p2.colCounts)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 2)
      expect(p1.solution).not.toEqual(p2.solution)
    })

    it('easy puzzle has size 4', () => {
      const puzzle = generate('easy', 7)
      expect(puzzle.size).toBe(4)
    })

    it('normal puzzle has size 6', () => {
      const puzzle = generate('normal', 7)
      expect(puzzle.size).toBe(6)
    })

    it('hard puzzle has size 7', () => {
      const puzzle = generate('hard', 7)
      expect(puzzle.size).toBe(7)
    })

    it('expert puzzle has size 8', () => {
      const puzzle = generate('expert', 7)
      expect(puzzle.size).toBe(8)
    })

    it('fixed grid dimensions match size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.fixed.length).toBe(puzzle.size)
      puzzle.fixed.forEach(row => expect(row.length).toBe(puzzle.size))
    })

    it('solution dimensions match size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.solution.length).toBe(puzzle.size)
      puzzle.solution.forEach(row => expect(row.length).toBe(puzzle.size))
    })

    it('rowCounts length matches size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.rowCounts.length).toBe(puzzle.size)
    })

    it('colCounts length matches size', () => {
      const puzzle = generate('normal', 5)
      expect(puzzle.colCounts.length).toBe(puzzle.size)
    })

    it('easy puzzle has correct A count range (4-5)', () => {
      const puzzle = generate('easy', 7)
      const aCount = puzzle.fixed.flat().filter(c => c === 'A').length
      expect(aCount).toBeGreaterThanOrEqual(4)
      expect(aCount).toBeLessThanOrEqual(5)
    })

    it('normal puzzle has correct A count range (6-8)', () => {
      const puzzle = generate('normal', 7)
      const aCount = puzzle.fixed.flat().filter(c => c === 'A').length
      expect(aCount).toBeGreaterThanOrEqual(6)
      expect(aCount).toBeLessThanOrEqual(8)
    })

    it('rowCounts sum equals colCounts sum equals number of Bs in solution', () => {
      const puzzle = generate('normal', 5)
      const bCount = puzzle.solution.flat().filter(c => c === 'B').length
      const rowSum = puzzle.rowCounts.reduce((a, b) => a + b, 0)
      const colSum = puzzle.colCounts.reduce((a, b) => a + b, 0)
      expect(rowSum).toBe(bCount)
      expect(colSum).toBe(bCount)
    })

    it('B cells in solution are not 8-directionally adjacent to each other', () => {
      const puzzle = generate('normal', 5)
      const { solution, size } = puzzle
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (solution[r][c] === 'B') {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue
                const nr = r + dr
                const nc = c + dc
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                  expect(solution[nr][nc]).not.toBe('B')
                }
              }
            }
          }
        }
      }
    })

    it('each A in fixed has exactly one B adjacent (orthogonally) in solution', () => {
      const puzzle = generate('normal', 5)
      const { fixed, solution, size } = puzzle
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (fixed[r][c] === 'A') {
            let adjBCount = 0
            if (r > 0 && solution[r - 1][c] === 'B') adjBCount++
            if (r < size - 1 && solution[r + 1][c] === 'B') adjBCount++
            if (c > 0 && solution[r][c - 1] === 'B') adjBCount++
            if (c < size - 1 && solution[r][c + 1] === 'B') adjBCount++
            expect(adjBCount).toBe(1)
          }
        }
      }
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for a generated easy puzzle', () => {
      const puzzle = generate('easy', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns 1 for a generated normal puzzle', () => {
      const puzzle = generate('normal', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns 1 for a generated hard puzzle', () => {
      const puzzle = generate('hard', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns 1 for a generated expert puzzle', () => {
      const puzzle = generate('expert', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })
  })

  describe('solve', () => {
    it('solves a generated easy puzzle', () => {
      const puzzle = generate('easy', 1)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
    })

    it('solved solution matches expected solution', () => {
      const puzzle = generate('normal', 2)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      expect(solved!.solution).toEqual(puzzle.solution)
    })

    it('returns null for unsolvable puzzle', () => {
      // Create a puzzle with contradictory counts
      const puzzle = generate('easy', 1)
      const badPuzzle: PandaPuzzle = {
        ...puzzle,
        // Set rowCounts to all 0 but colCounts to original (or vice versa), creating contradiction
        rowCounts: puzzle.rowCounts.map(() => 99),
      }
      expect(solve(badPuzzle)).toBeNull()
    })

    it('solves all difficulties', () => {
      const difficulties = ['easy', 'normal', 'hard', 'expert'] as const
      for (const difficulty of difficulties) {
        const puzzle = generate(difficulty, 42)
        const solved = solve(puzzle)
        expect(solved).not.toBeNull()
      }
    })
  })

  describe('validate', () => {
    const buildState = (puzzle: PandaPuzzle): PandaState => ({
      ...puzzle,
      current: Array.from({ length: puzzle.size }, () =>
        Array(puzzle.size).fill('empty') as CellContent[]
      ),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })

    // Find a cell that should be B in the solution
    const findBCell = (puzzle: PandaPuzzle): [number, number] => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c] === 'B') return [r, c]
        }
      }
      throw new Error('no B cell in solution')
    }

    // Find a cell that should be empty in the solution
    const findEmptyCell = (puzzle: PandaPuzzle): [number, number] => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c] === 'empty') return [r, c]
        }
      }
      throw new Error('no empty cell in solution')
    }

    it('correct B placement returns correct=true, lifeLost=false', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findBCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, value: 'B' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('wrong B placement returns correct=false, lifeLost=true', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmptyCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, value: 'B' })
      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(true)
    })

    it('correct crossed placement returns correct=true, lifeLost=false', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmptyCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, value: 'crossed' })
      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('wrong crossed placement on B cell returns correct=false, lifeLost=true', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findBCell(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, { row, col, value: 'crossed' })
      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(true)
    })

    it('detects puzzle completion', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      // Find all B cells
      const bCells: [number, number][] = []
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.solution[r][c] === 'B') bCells.push([r, c])
        }
      }

      if (bCells.length === 0) return

      // Fill all but the last B cell
      const lastBCell = bCells[bCells.length - 1]
      for (let i = 0; i < bCells.length - 1; i++) {
        const [r, c] = bCells[i]
        state.current[r][c] = 'B'
      }

      const result = validate(state, {
        row: lastBCell[0],
        col: lastBCell[1],
        value: 'B',
      })

      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
    })
  })
})
