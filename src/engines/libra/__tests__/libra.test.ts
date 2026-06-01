import { generate } from '../generator'
import { solve, countSolutions } from '../solver'
import { validate } from '../validator'
import { CellValue, LibraPuzzle, LibraState } from '../types'

jest.setTimeout(120000)

describe('Libra Engine', () => {
  describe('generate', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert'] as const

    for (const difficulty of difficulties) {
      describe(difficulty, () => {
        it('generates 10 solvable puzzles', () => {
          for (let i = 0; i < 10; i++) {
            const puzzle = generate(difficulty, 1000 + i)
            expect(puzzle.initial).toBeDefined()
            expect(puzzle.solution).toBeDefined()
            expect(puzzle.difficulty).toBe(difficulty)

            const solved = solve(puzzle)
            expect(solved).not.toBeNull()
          }
        })

        it('countSolutions returns 1 (unique solution)', () => {
          for (let i = 0; i < 3; i++) {
            const puzzle = generate(difficulty, 2000 + i)
            const count = countSolutions(puzzle)
            expect(count).toBe(1)
          }
        })
      })
    }

    it('same seed produces the same puzzle', () => {
      const p1 = generate('normal', 42)
      const p2 = generate('normal', 42)
      expect(p1.initial).toEqual(p2.initial)
      expect(p1.solution).toEqual(p2.solution)
      expect(p1.constraints).toEqual(p2.constraints)
    })

    it('different seeds produce different puzzles', () => {
      const p1 = generate('normal', 1)
      const p2 = generate('normal', 2)
      expect(p1.initial).not.toEqual(p2.initial)
    })

    it('solution has correct grid size for easy (6x6)', () => {
      const puzzle = generate('easy', 7)
      expect(puzzle.size).toBe(6)
      expect(puzzle.solution.length).toBe(6)
      puzzle.solution.forEach(row => expect(row.length).toBe(6))
    })

    it('solution has correct grid size for normal (8x8)', () => {
      const puzzle = generate('normal', 7)
      expect(puzzle.size).toBe(8)
      expect(puzzle.solution.length).toBe(8)
      puzzle.solution.forEach(row => expect(row.length).toBe(8))
    })

    it('solution has correct grid size for expert (10x10)', () => {
      const puzzle = generate('expert', 7)
      expect(puzzle.size).toBe(10)
      expect(puzzle.solution.length).toBe(10)
      puzzle.solution.forEach(row => expect(row.length).toBe(10))
    })

    it('solution rows are balanced (equal A and B)', () => {
      const puzzle = generate('easy', 55)
      const half = puzzle.size / 2
      puzzle.solution.forEach(row => {
        const aCount = row.filter(v => v === 'A').length
        const bCount = row.filter(v => v === 'B').length
        expect(aCount).toBe(half)
        expect(bCount).toBe(half)
      })
    })

    it('solution columns are balanced (equal A and B)', () => {
      const puzzle = generate('easy', 55)
      const half = puzzle.size / 2
      for (let c = 0; c < puzzle.size; c++) {
        const col = puzzle.solution.map(row => row[c])
        const aCount = col.filter(v => v === 'A').length
        const bCount = col.filter(v => v === 'B').length
        expect(aCount).toBe(half)
        expect(bCount).toBe(half)
      }
    })

    it('solution has no 3 consecutive same values in rows', () => {
      const puzzle = generate('easy', 55)
      puzzle.solution.forEach(row => {
        for (let c = 0; c < puzzle.size - 2; c++) {
          const triplet = [row[c], row[c + 1], row[c + 2]]
          expect(triplet[0] === triplet[1] && triplet[1] === triplet[2]).toBe(false)
        }
      })
    })

    it('solution has no 3 consecutive same values in columns', () => {
      const puzzle = generate('easy', 55)
      for (let c = 0; c < puzzle.size; c++) {
        for (let r = 0; r < puzzle.size - 2; r++) {
          const a = puzzle.solution[r][c]
          const b = puzzle.solution[r + 1][c]
          const d = puzzle.solution[r + 2][c]
          expect(a === b && b === d).toBe(false)
        }
      }
    })

    it('solution rows are all unique', () => {
      const puzzle = generate('easy', 55)
      const rowStrings = puzzle.solution.map(row => row.join(''))
      const uniqueRows = new Set(rowStrings)
      expect(uniqueRows.size).toBe(puzzle.size)
    })

    it('solution columns are all unique', () => {
      const puzzle = generate('easy', 55)
      const colStrings: string[] = []
      for (let c = 0; c < puzzle.size; c++) {
        colStrings.push(puzzle.solution.map(row => row[c]).join(''))
      }
      const uniqueCols = new Set(colStrings)
      expect(uniqueCols.size).toBe(puzzle.size)
    })

    it('constraints are satisfied by solution', () => {
      const puzzle = generate('normal', 33)
      for (const constraint of puzzle.constraints) {
        const v1 = puzzle.solution[constraint.r1][constraint.c1]
        const v2 = puzzle.solution[constraint.r2][constraint.c2]
        expect(v1).not.toBeNull()
        expect(v2).not.toBeNull()
        if (constraint.type === 'eq') {
          expect(v1).toBe(v2)
        } else {
          expect(v1).not.toBe(v2)
        }
      }
    })

    it('initial cells are a subset of solution', () => {
      const puzzle = generate('easy', 99)
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          const init = puzzle.initial[r][c]
          if (init !== null) {
            expect(init).toBe(puzzle.solution[r][c])
          }
        }
      }
    })
  })

  describe('solve', () => {
    it('solves a generated puzzle', () => {
      const puzzle = generate('easy', 1)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      solved!.initial.forEach(row => {
        row.forEach(cell => expect(cell).not.toBeNull())
      })
    })

    it('solved grid matches the solution field', () => {
      const puzzle = generate('normal', 2)
      const solved = solve(puzzle)
      expect(solved).not.toBeNull()
      expect(solved!.initial).toEqual(puzzle.solution)
    })

    it('returns null for an unsolvable puzzle', () => {
      const size = 6
      // Force two rows identical - which violates uniqueness
      const badInitial: CellValue[][] = Array.from({ length: size }, () =>
        Array(size).fill(null) as CellValue[]
      )
      // Force row 0 and row 1 to be the same complete rows
      // AABBAB - valid balanced, no triples
      const forcedRow: CellValue[] = ['A', 'A', 'B', 'B', 'A', 'B']
      badInitial[0] = [...forcedRow]
      badInitial[1] = [...forcedRow]

      const puzzle: LibraPuzzle = {
        id: 'test-unsolvable',
        size,
        initial: badInitial,
        solution: badInitial,
        constraints: [],
        difficulty: 'easy',
        seed: 0,
      }
      expect(solve(puzzle)).toBeNull()
    })
  })

  describe('countSolutions', () => {
    it('returns 1 for a generated puzzle', () => {
      const puzzle = generate('easy', 99)
      expect(countSolutions(puzzle)).toBe(1)
    })

    it('returns more than 1 for an empty board', () => {
      const size = 6
      const emptyInitial: CellValue[][] = Array.from({ length: size }, () =>
        Array(size).fill(null) as CellValue[]
      )
      const puzzle: LibraPuzzle = {
        id: 'test-empty',
        size,
        initial: emptyInitial,
        solution: emptyInitial,
        constraints: [],
        difficulty: 'easy',
        seed: 0,
      }
      expect(countSolutions(puzzle)).toBeGreaterThan(1)
    })
  })

  describe('validate', () => {
    const buildState = (puzzle: LibraPuzzle): LibraState => ({
      ...puzzle,
      current: puzzle.initial.map(row => [...row] as CellValue[]),
      mistakes: 0,
      hintsUsed: 0,
      startedAt: Date.now(),
      elapsedSeconds: 0,
    })

    const findEmpty = (puzzle: LibraPuzzle): [number, number] => {
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.initial[r][c] === null) return [r, c]
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
      })

      expect(result.correct).toBe(true)
      expect(result.lifeLost).toBe(false)
    })

    it('returns correct=false and lifeLost=true for a wrong move', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmpty(puzzle)
      const state = buildState(puzzle)

      const correctVal = puzzle.solution[row][col]
      const wrongVal: CellValue = correctVal === 'A' ? 'B' : 'A'

      const result = validate(state, {
        row,
        col,
        value: wrongVal,
      })

      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(true)
    })

    it('returns correct=false for a null move', () => {
      const puzzle = generate('easy', 5)
      const [row, col] = findEmpty(puzzle)
      const state = buildState(puzzle)

      const result = validate(state, {
        row,
        col,
        value: null,
      })

      expect(result.correct).toBe(false)
      expect(result.lifeLost).toBe(false)
    })

    it('detects puzzle completion', () => {
      const puzzle = generate('easy', 5)
      const state = buildState(puzzle)

      // Find last empty cell
      let lastRow = -1
      let lastCol = -1
      let emptyCells = 0
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.initial[r][c] === null) {
            emptyCells++
            lastRow = r
            lastCol = c
          }
        }
      }

      if (emptyCells === 0) return // Skip if no empty cells

      // Fill all empty cells except the last one
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.initial[r][c] === null && !(r === lastRow && c === lastCol)) {
            state.current[r][c] = puzzle.solution[r][c]
          }
        }
      }

      const result = validate(state, {
        row: lastRow,
        col: lastCol,
        value: puzzle.solution[lastRow][lastCol],
      })

      expect(result.correct).toBe(true)
      expect(result.isComplete).toBe(true)
    })
  })
})
