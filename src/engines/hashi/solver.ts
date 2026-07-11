import { HashiPuzzle, Island, Bridge } from './types'

export function edgesCross(
  a1: Island, a2: Island,
  b1: Island, b2: Island
): boolean {
  const aH = a1.row === a2.row
  const bH = b1.row === b2.row
  if (aH === bH) return false
  let hr: number, hc1: number, hc2: number, vc: number, vr1: number, vr2: number
  if (aH) {
    hr = a1.row; hc1 = Math.min(a1.col, a2.col); hc2 = Math.max(a1.col, a2.col)
    vc = b1.col; vr1 = Math.min(b1.row, b2.row); vr2 = Math.max(b1.row, b2.row)
  } else {
    hr = b1.row; hc1 = Math.min(b1.col, b2.col); hc2 = Math.max(b1.col, b2.col)
    vc = a1.col; vr1 = Math.min(a1.row, a2.row); vr2 = Math.max(a1.row, a2.row)
  }
  return hc1 < vc && vc < hc2 && vr1 < hr && hr < vr2
}

export function findPotentialEdges(islands: Island[]): [number, number][] {
  const pos = new Map<string, Island>()
  for (const island of islands) pos.set(`${island.row},${island.col}`, island)
  const edges: [number, number][] = []
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i], b = islands[j]
      if (a.row !== b.row && a.col !== b.col) continue
      let blocked = false
      if (a.row === b.row) {
        const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col)
        for (let c = c1 + 1; c < c2 && !blocked; c++) blocked = pos.has(`${a.row},${c}`)
      } else {
        const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row)
        for (let r = r1 + 1; r < r2 && !blocked; r++) blocked = pos.has(`${r},${a.col}`)
      }
      if (!blocked) edges.push([a.id, b.id])
    }
  }
  return edges
}

function buildBridgeMap(bridges: Bridge[]): Map<number, Map<number, number>> {
  const m = new Map<number, Map<number, number>>()
  for (const b of bridges) {
    if (!m.has(b.from)) m.set(b.from, new Map())
    if (!m.has(b.to)) m.set(b.to, new Map())
    m.get(b.from)!.set(b.to, b.count)
    m.get(b.to)!.set(b.from, b.count)
  }
  return m
}

function isConnected(islands: Island[], bm: Map<number, Map<number, number>>): boolean {
  if (islands.length === 0) return true
  const visited = new Set<number>([islands[0].id])
  const queue = [islands[0].id]
  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const [nid, cnt] of (bm.get(cur) ?? new Map())) {
      if (cnt > 0 && !visited.has(nid)) { visited.add(nid); queue.push(nid) }
    }
  }
  return visited.size === islands.length
}

interface SearchState {
  current: Bridge[]
  counts: Map<number, number>
  found: number
}

function search(
  islands: Island[],
  islandMap: Map<number, Island>,
  edges: [number, number][],
  islandEdgeIndices: Map<number, number[]>,
  st: SearchState,
  idx: number,
  limit: number
): void {
  if (st.found >= limit) return
  if (idx === edges.length) {
    for (const isl of islands) {
      if ((st.counts.get(isl.id) ?? 0) !== isl.bridges) return
    }
    const bm = buildBridgeMap(st.current)
    for (const isl of islands) if (!bm.has(isl.id)) bm.set(isl.id, new Map())
    if (isConnected(islands, bm)) st.found++
    return
  }
  const [fid, tid] = edges[idx]
  const from = islandMap.get(fid)!, to = islandMap.get(tid)!
  const fc = st.counts.get(fid) ?? 0, tc = st.counts.get(tid) ?? 0
  for (let cnt = 0; cnt <= 2; cnt++) {
    if (fc + cnt > from.bridges || tc + cnt > to.bridges) break
    if (cnt > 0) {
      let crosses = false
      for (const b of st.current) {
        if (edgesCross(from, to, islandMap.get(b.from)!, islandMap.get(b.to)!)) { crosses = true; break }
      }
      if (crosses) continue
      st.current.push({ from: fid, to: tid, count: cnt as 1 | 2 })
    }
    st.counts.set(fid, fc + cnt)
    st.counts.set(tid, tc + cnt)
    let prunable = false
    for (const isl of islands) {
      const curr = st.counts.get(isl.id) ?? 0
      const needed = isl.bridges - curr
      if (needed < 0) { prunable = true; break }
      const maxAdd = (islandEdgeIndices.get(isl.id) ?? []).filter(i => i > idx).length * 2
      if (maxAdd < needed) { prunable = true; break }
    }
    if (!prunable) search(islands, islandMap, edges, islandEdgeIndices, st, idx + 1, limit)
    if (cnt > 0) st.current.pop()
    st.counts.set(fid, fc)
    st.counts.set(tid, tc)
    if (st.found >= limit) return
  }
}

export function countSolutions(puzzle: HashiPuzzle): number {
  const islandMap = new Map(puzzle.islands.map(i => [i.id, i]))
  const edges = findPotentialEdges(puzzle.islands)
  const islandEdgeIndices = new Map<number, number[]>()
  for (const isl of puzzle.islands) islandEdgeIndices.set(isl.id, [])
  for (let i = 0; i < edges.length; i++) {
    islandEdgeIndices.get(edges[i][0])!.push(i)
    islandEdgeIndices.get(edges[i][1])!.push(i)
  }
  const counts = new Map(puzzle.islands.map(i => [i.id, 0]))
  const st: SearchState = { current: [], counts, found: 0 }
  search(puzzle.islands, islandMap, edges, islandEdgeIndices, st, 0, 2)
  return st.found
}

export function solve(puzzle: HashiPuzzle): HashiPuzzle | null {
  const islandMap = new Map(puzzle.islands.map(i => [i.id, i]))
  const counts = new Map(puzzle.islands.map(i => [i.id, 0]))
  for (let i = 0; i < puzzle.solution.length; i++) {
    for (let j = i + 1; j < puzzle.solution.length; j++) {
      const a = puzzle.solution[i], b = puzzle.solution[j]
      if (edgesCross(islandMap.get(a.from)!, islandMap.get(a.to)!, islandMap.get(b.from)!, islandMap.get(b.to)!)) return null
    }
  }
  for (const bridge of puzzle.solution) {
    counts.set(bridge.from, (counts.get(bridge.from) ?? 0) + bridge.count)
    counts.set(bridge.to, (counts.get(bridge.to) ?? 0) + bridge.count)
  }
  for (const isl of puzzle.islands) {
    if ((counts.get(isl.id) ?? 0) !== isl.bridges) return null
  }
  const bm = buildBridgeMap(puzzle.solution)
  for (const isl of puzzle.islands) if (!bm.has(isl.id)) bm.set(isl.id, new Map())
  return isConnected(puzzle.islands, bm) ? puzzle : null
}
