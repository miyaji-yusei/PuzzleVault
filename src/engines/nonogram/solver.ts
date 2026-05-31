import { NonogramPuzzle } from './types'

// 1行/列のヒントから確定できるセルを計算するラインソルバー
// 戻り値: true=塗り確定, false=空白確定, null=未確定
export function solveLine(clues: number[], size: number, known: (boolean | null)[]): (boolean | null)[] {
  // clues が [0] の場合は全空白
  if (clues.length === 1 && clues[0] === 0) {
    return Array(size).fill(false)
  }

  const result: (boolean | null)[] = Array(size).fill(null)

  // 全パターン列挙して AND/OR で確定マスを求める
  const filled: boolean[] = Array(size).fill(false)
  const empty: boolean[] = Array(size).fill(false)
  let found = false

  function place(clueIdx: number, pos: number, current: boolean[]): void {
    if (clueIdx === clues.length) {
      // 残りは全て空白
      for (let i = pos; i < size; i++) {
        if (known[i] === true) return // 矛盾
      }
      // 矛盾チェック: known と current が一致するか
      for (let i = 0; i < size; i++) {
        if (known[i] !== null && known[i] !== current[i]) return
      }
      found = true
      for (let i = 0; i < size; i++) {
        if (current[i]) filled[i] = true
        else empty[i] = true
      }
      return
    }

    const len = clues[clueIdx]
    // このブロックを pos 以降に置ける最大位置を計算
    let minEnd = pos
    for (let k = clueIdx; k < clues.length; k++) {
      minEnd += clues[k]
      if (k < clues.length - 1) minEnd++ // 間の空白
    }
    const maxStart = size - (minEnd - pos)

    for (let start = pos; start <= maxStart; start++) {
      // [start, start+len) を塗る
      // 事前チェック: 置けるか
      let ok = true
      // start の前は空白でないといけない（前のブロックとの間）
      if (start > 0 && current[start - 1]) { ok = false }
      // [start, start+len) が known=false でないこと
      if (ok) {
        for (let i = start; i < start + len; i++) {
          if (known[i] === false) { ok = false; break }
        }
      }
      // start より前の空白が known=true でないこと
      if (ok) {
        for (let i = pos; i < start; i++) {
          if (known[i] === true) { ok = false; break }
        }
      }

      if (!ok) continue

      const prev = current.slice()
      for (let i = pos; i < start; i++) current[i] = false
      for (let i = start; i < start + len; i++) current[i] = true
      if (start + len < size) current[start + len] = false

      place(clueIdx + 1, start + len + 1, current)

      // restore
      for (let i = 0; i < size; i++) current[i] = prev[i]
    }
  }

  place(0, 0, Array(size).fill(false))

  if (!found) return result // 矛盾: 解なし

  for (let i = 0; i < size; i++) {
    if (filled[i] && !empty[i]) result[i] = true
    else if (!filled[i] && empty[i]) result[i] = false
  }

  return result
}

interface PuzzleInput {
  rowClues: number[][]
  colClues: number[][]
  size: number
  solution?: boolean[][]
}

// ラインソルバーで反復伝播して全マス確定するか調べる
export function isUnique(puzzle: PuzzleInput): boolean {
  const { rowClues, colClues, size } = puzzle
  const grid: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  )

  let changed = true
  while (changed) {
    changed = false
    for (let r = 0; r < size; r++) {
      const lineResult = solveLine(rowClues[r], size, grid[r])
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === null && lineResult[c] !== null) {
          grid[r][c] = lineResult[c]
          changed = true
        }
      }
    }
    for (let c = 0; c < size; c++) {
      const col = grid.map(row => row[c])
      const lineResult = solveLine(colClues[c], size, col)
      for (let r = 0; r < size; r++) {
        if (grid[r][c] === null && lineResult[r] !== null) {
          grid[r][c] = lineResult[r]
          changed = true
        }
      }
    }
  }

  return grid.every(row => row.every(cell => cell !== null))
}

export function solve(puzzle: NonogramPuzzle): NonogramPuzzle | null {
  const { rowClues, colClues, size } = puzzle
  const grid: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  )

  let changed = true
  while (changed) {
    changed = false
    for (let r = 0; r < size; r++) {
      const lineResult = solveLine(rowClues[r], size, grid[r])
      for (let c = 0; c < size; c++) {
        if (lineResult[c] !== null) {
          if (grid[r][c] !== null && grid[r][c] !== lineResult[c]) return null
          if (grid[r][c] === null) {
            grid[r][c] = lineResult[c]
            changed = true
          }
        }
      }
    }
    for (let c = 0; c < size; c++) {
      const col = grid.map(row => row[c])
      const lineResult = solveLine(colClues[c], size, col)
      for (let r = 0; r < size; r++) {
        if (lineResult[r] !== null) {
          if (grid[r][c] !== null && grid[r][c] !== lineResult[r]) return null
          if (grid[r][c] === null) {
            grid[r][c] = lineResult[r]
            changed = true
          }
        }
      }
    }
  }

  if (!grid.every(row => row.every(cell => cell !== null))) return null

  return {
    ...puzzle,
    solution: grid as boolean[][],
  }
}

export function countSolutions(puzzle: NonogramPuzzle): number {
  if (isUnique(puzzle)) return 1
  // ラインソルバーで解けない場合は複数解の可能性あり（簡略化: 2を返す）
  return 2
}
