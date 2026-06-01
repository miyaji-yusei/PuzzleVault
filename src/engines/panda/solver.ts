import { CellContent, CellFixed, PandaPuzzle } from './types'

// Check if placing B at (row, col) violates the B-adjacency constraint (8 directions)
function isBAdjacentSafe(
  grid: CellContent[][],
  row: number,
  col: number,
  size: number
): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (grid[nr][nc] === 'B') return false
      }
    }
  }
  return true
}

// Get orthogonal neighbors of (row, col)
function getOrthogonalNeighbors(
  row: number,
  col: number,
  size: number
): [number, number][] {
  const neighbors: [number, number][] = []
  if (row > 0) neighbors.push([row - 1, col])
  if (row < size - 1) neighbors.push([row + 1, col])
  if (col > 0) neighbors.push([row, col - 1])
  if (col < size - 1) neighbors.push([row, col + 1])
  return neighbors
}

interface SolverState {
  grid: CellContent[][]
  rowCounts: number[]
  colCounts: number[]
  rowPlaced: number[]
  colPlaced: number[]
  size: number
  fixed: CellFixed[][]
  // For each A cell, which B is assigned (null = unassigned)
  pandaAssignment: ([number, number] | null)[]
  pandaCells: [number, number][]
}

function initSolverState(puzzle: PandaPuzzle): SolverState {
  const size = puzzle.size
  const grid: CellContent[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) =>
      puzzle.fixed[r][c] === 'A' ? 'A' : 'empty'
    )
  )

  const pandaCells: [number, number][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzle.fixed[r][c] === 'A') {
        pandaCells.push([r, c])
      }
    }
  }

  return {
    grid,
    rowCounts: [...puzzle.rowCounts],
    colCounts: [...puzzle.colCounts],
    rowPlaced: Array(size).fill(0),
    colPlaced: Array(size).fill(0),
    size,
    fixed: puzzle.fixed,
    pandaAssignment: Array(pandaCells.length).fill(null),
    pandaCells,
  }
}

// Backtracking solver
// Returns the solution grid or null
function backtrack(
  state: SolverState,
  pandaIdx: number,
  solutions: CellContent[][][],
  maxSolutions: number
): void {
  if (solutions.length >= maxSolutions) return

  const { pandaCells, size } = state

  if (pandaIdx === pandaCells.length) {
    // Check row/col counts are satisfied
    for (let i = 0; i < size; i++) {
      if (state.rowPlaced[i] !== state.rowCounts[i]) return
      if (state.colPlaced[i] !== state.colCounts[i]) return
    }
    // Record solution
    const solutionCopy = state.grid.map(row => [...row] as CellContent[])
    solutions.push(solutionCopy)
    return
  }

  const [pr, pc] = pandaCells[pandaIdx]

  // Get candidates: orthogonal neighbors that are 'empty' and pass adjacency check
  const neighbors = getOrthogonalNeighbors(pr, pc, size)

  for (const [nr, nc] of neighbors) {
    if (state.grid[nr][nc] !== 'empty') continue

    // Check row/col count feasibility
    if (state.rowPlaced[nr] >= state.rowCounts[nr]) continue
    if (state.colPlaced[nc] >= state.colCounts[nc]) continue

    // Check B adjacency constraint
    if (!isBAdjacentSafe(state.grid, nr, nc, size)) continue

    // Also check that the panda cell at (pr,pc) does not already have a B paired
    // (by checking if this A already has a previous assignment - handled by pandaIdx order)

    // Place B
    state.grid[nr][nc] = 'B'
    state.rowPlaced[nr]++
    state.colPlaced[nc]++
    state.pandaAssignment[pandaIdx] = [nr, nc]

    backtrack(state, pandaIdx + 1, solutions, maxSolutions)

    if (solutions.length >= maxSolutions) {
      // Leave state dirty - we're done
      return
    }

    // Remove B
    state.grid[nr][nc] = 'empty'
    state.rowPlaced[nr]--
    state.colPlaced[nc]--
    state.pandaAssignment[pandaIdx] = null
  }
}

export function solve(puzzle: PandaPuzzle): PandaPuzzle | null {
  const state = initSolverState(puzzle)
  const solutions: CellContent[][][] = []
  backtrack(state, 0, solutions, 1)

  if (solutions.length === 0) return null

  const solution = solutions[0]
  return { ...puzzle, solution }
}

export function countSolutions(puzzle: PandaPuzzle): number {
  const state = initSolverState(puzzle)
  const solutions: CellContent[][][] = []
  backtrack(state, 0, solutions, 2)
  return solutions.length
}
