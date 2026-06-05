import { Difficulty } from '../../types/engine'
import { Island, Bridge, HashiPuzzle } from './types'
import { findPotentialEdges, edgesCross, countSolutions } from './solver'

function createRng(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = result[i] as T; result[i] = result[j] as T; result[j] = tmp
  }
  return result
}

const DIFFICULTY_CONFIG: Record<Difficulty, { gridSize: number; minIslands: number; maxIslands: number }> = {
  easy:   { gridSize: 7,  minIslands: 10, maxIslands: 14 },
  normal: { gridSize: 10, minIslands: 20, maxIslands: 28 },
  hard:   { gridSize: 13, minIslands: 35, maxIslands: 45 },
  expert: { gridSize: 16, minIslands: 50, maxIslands: 60 },
}

function placeIslands(gridSize: number, target: number, rng: () => number): Island[] {
  const occupied = new Set<string>()
  const islands: Island[] = []
  const positions: [number, number][] = []
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      positions.push([r, c])
  for (const [r, c] of shuffle(positions, rng)) {
    if (islands.length >= target) break
    const key = `${r},${c}`
    if (occupied.has(key)) continue
    const adjacentOccupied =
      occupied.has(`${r-1},${c}`) || occupied.has(`${r+1},${c}`) ||
      occupied.has(`${r},${c-1}`) || occupied.has(`${r},${c+1}`)
    if (adjacentOccupied) continue
    occupied.add(key)
    islands.push({ id: islands.length, row: r, col: c, bridges: 0 })
  }
  return islands
}

function buildSpanningTree(
  islands: Island[],
  edges: [number, number][],
  islandMap: Map<number, Island>,
  rng: () => number
): Bridge[] | null {
  const shuffled = shuffle(edges, rng)
  const solution: Bridge[] = []
  const connected = new Set<number>([islands[0].id])
  const unconnected = new Set(islands.slice(1).map(i => i.id))
  let changed = true
  while (unconnected.size > 0 && changed) {
    changed = false
    for (const [fid, tid] of shuffled) {
      const fc = connected.has(fid), tc = connected.has(tid)
      if (fc === tc) continue
      const a1 = islandMap.get(fid)!, a2 = islandMap.get(tid)!
      let crosses = false
      for (const b of solution) {
        if (edgesCross(a1, a2, islandMap.get(b.from)!, islandMap.get(b.to)!)) { crosses = true; break }
      }
      if (crosses) continue
      const cnt: 1 | 2 = rng() < 0.35 ? 2 : 1
      solution.push({ from: fid, to: tid, count: cnt })
      connected.add(fid); connected.add(tid)
      unconnected.delete(fid); unconnected.delete(tid)
      changed = true
    }
  }
  return unconnected.size === 0 ? solution : null
}

function tryGenerate(difficulty: Difficulty, seed: number): HashiPuzzle | null {
  const { gridSize, minIslands, maxIslands } = DIFFICULTY_CONFIG[difficulty]
  const rng = createRng(seed)
  const target = minIslands + Math.floor(rng() * (maxIslands - minIslands + 1))
  const islands = placeIslands(gridSize, target, rng)
  if (islands.length < minIslands) return null
  if (islands.length <= 2) return null
  const islandMap = new Map(islands.map(i => [i.id, i]))
  const edges = findPotentialEdges(islands)
  const solution = buildSpanningTree(islands, edges, islandMap, rng)
  if (!solution) return null
  if (solution.length < 3) return null
  // Add extra edges for density
  const usedKeys = new Set(solution.map(b => `${Math.min(b.from,b.to)}-${Math.max(b.from,b.to)}`))
  const extras = shuffle(
    edges.filter(([a,b]) => !usedKeys.has(`${Math.min(a,b)}-${Math.max(a,b)}`)),
    rng
  )
  const extraCount = Math.floor(rng() * Math.ceil(solution.length * 0.3))
  for (let i = 0; i < Math.min(extraCount, extras.length); i++) {
    const [fid, tid] = extras[i]
    const a1 = islandMap.get(fid)!, a2 = islandMap.get(tid)!
    let crosses = false
    for (const b of solution) {
      if (edgesCross(a1, a2, islandMap.get(b.from)!, islandMap.get(b.to)!)) { crosses = true; break }
    }
    if (!crosses) solution.push({ from: fid, to: tid, count: rng() < 0.3 ? 2 : 1 })
  }
  // Set island bridge counts
  for (const b of solution) {
    islandMap.get(b.from)!.bridges += b.count
    islandMap.get(b.to)!.bridges += b.count
  }
  if (islands.some(i => i.bridges === 0 || i.bridges > 8)) return null
  const puzzle: HashiPuzzle = { id: `hashi-${difficulty}-${seed}`, gridSize, islands, solution, difficulty, seed }
  // Check uniqueness only for easy (affordable cost)
  if (difficulty === 'easy' && countSolutions(puzzle) !== 1) return null
  return puzzle
}

export function generate(difficulty: Difficulty, seed?: number): HashiPuzzle {
  const base = seed !== undefined ? seed >>> 0 : Date.now() >>> 0
  for (let attempt = 0; attempt < 300; attempt++) {
    const puzzle = tryGenerate(difficulty, (base + attempt) >>> 0)
    if (puzzle) return puzzle
  }
  // Fallback: 4-island square layout
  const { gridSize } = DIFFICULTY_CONFIG[difficulty]
  const r1 = 1, c1 = 1, r2 = gridSize - 2, c2 = gridSize - 2
  return {
    id: `hashi-${difficulty}-${base}`,
    gridSize,
    islands: [
      { id: 0, row: r1, col: c1, bridges: 2 },
      { id: 1, row: r1, col: c2, bridges: 2 },
      { id: 2, row: r2, col: c1, bridges: 2 },
      { id: 3, row: r2, col: c2, bridges: 2 },
    ],
    solution: [
      { from: 0, to: 1, count: 1 },
      { from: 0, to: 2, count: 1 },
      { from: 1, to: 3, count: 1 },
      { from: 2, to: 3, count: 1 },
    ],
    difficulty,
    seed: base,
  }
}
