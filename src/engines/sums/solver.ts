import { SumsPuzzle, CellMark } from './types'

export function solve(puzzle: SumsPuzzle): SumsPuzzle | null {
  const { grid, solution, rowSums, colSums, colorGroups } = puzzle
  const size = grid.length

  // Verify that the stored solution satisfies all constraints
  for (let i = 0; i < size; i++) {
    const rSum = solution[i]!.reduce((s, m, j) => s + (m === 'circle' ? grid[i]![j]! : 0), 0)
    if (rSum !== rowSums[i]) return null
  }
  for (let j = 0; j < size; j++) {
    const cSum = solution.reduce((s, row, i) => s + (row[j] === 'circle' ? grid[i]![j]! : 0), 0)
    if (cSum !== colSums[j]) return null
  }
  for (const group of colorGroups) {
    const gSum = group.cells.reduce(
      (s, [r, c]) => s + (solution[r]![c] === 'circle' ? grid[r]![c]! : 0), 0
    )
    if (gSum !== group.targetSum) return null
  }

  return puzzle
}

export function countSolutions(puzzle: SumsPuzzle, maxOps = 1000000): number {
  const { grid, rowSums, colSums, colorGroups } = puzzle
  const SIZE = grid.length

  // Build cell order (row-major)
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      cells.push([r, c])

  // Build group membership map
  const groupOf = new Map<string, number>()
  for (const group of colorGroups)
    for (const [r, c] of group.cells)
      groupOf.set(`${r},${c}`, group.id)

  const current: CellMark[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  // Partial sums for pruning
  const rowPartial = Array(SIZE).fill(0)
  const colPartial = Array(SIZE).fill(0)
  const groupPartial = Array(colorGroups.length).fill(0)
  // Remaining cells per row/col/group
  const rowRem = Array(SIZE).fill(SIZE)
  const colRem = Array(SIZE).fill(SIZE)
  const groupRem = colorGroups.map(g => g.cells.length)

  let found = 0
  let ops = 0

  function bt(idx: number): void {
    if (found >= 2 || ops++ >= maxOps) return
    if (idx === cells.length) {
      // Verify all constraints exactly
      for (let i = 0; i < SIZE; i++)
        if (rowPartial[i] !== rowSums[i]) return
      for (let j = 0; j < SIZE; j++)
        if (colPartial[j] !== colSums[j]) return
      for (let k = 0; k < colorGroups.length; k++)
        if (groupPartial[k] !== colorGroups[k]!.targetSum) return
      found++
      return
    }

    const [r, c] = cells[idx]!
    const val = grid[r]![c]!
    const gid = groupOf.get(`${r},${c}`)!

    rowRem[r]--
    colRem[c]--
    groupRem[gid]--

    // Try circle
    rowPartial[r] += val
    colPartial[c] += val
    groupPartial[gid] += val

    const rOk = rowPartial[r] <= rowSums[r]!
    const cOk = colPartial[c] <= colSums[c]!
    const gOk = groupPartial[gid] <= colorGroups[gid]!.targetSum

    if (rOk && cOk && gOk) {
      current[r]![c] = 'circle'
      bt(idx + 1)
    }

    rowPartial[r] -= val
    colPartial[c] -= val
    groupPartial[gid] -= val

    // Try cross
    // Check if remaining cells can still satisfy constraints
    const rMin = rowPartial[r]
    const cMin = colPartial[c]
    const gMin = groupPartial[gid]

    if (
      rMin <= rowSums[r]! &&
      cMin <= colSums[c]! &&
      gMin <= colorGroups[gid]!.targetSum &&
      found < 2 && ops < maxOps
    ) {
      current[r]![c] = 'cross'
      bt(idx + 1)
    }

    current[r]![c] = null
    rowRem[r]++
    colRem[c]++
    groupRem[gid]++
  }

  bt(0)

  if (ops >= maxOps && found < 2) return -1
  return found
}
