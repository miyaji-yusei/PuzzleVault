/**
 * 問題データ一括生成スクリプト
 * 環境変数:
 *   GAME: 対象ゲーム (sudoku|nonogram|queens|libra|panda|hashi|all)
 *   PUZZLE_COUNT: 生成数（デフォルト100）
 *   DIFFICULTY_LEVELS: カンマ区切りの難易度（デフォルト: easy,normal,hard,expert）
 *   OUTPUT_DIR: 出力先ディレクトリ（デフォルト: data/）
 */

import * as fs from 'fs'
import * as path from 'path'

const GAME = process.env.GAME || 'all'
const PUZZLE_COUNT = parseInt(process.env.PUZZLE_COUNT || '100', 10)
const DIFFICULTY_LEVELS = (process.env.DIFFICULTY_LEVELS || 'easy,normal,hard,expert').split(',')
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'data')

const SUPPORTED_GAMES = ['sudoku', 'nonogram', 'queens', 'libra', 'panda', 'hashi', 'sums']
const TARGET_GAMES = GAME === 'all' ? SUPPORTED_GAMES : [GAME]

async function generateForGame(gameName: string): Promise<void> {
  console.warn(`[generate] ${gameName} の生成を開始...`)

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const engine = require(`../src/engines/${gameName}`)

    for (const difficulty of DIFFICULTY_LEVELS) {
      const outputDir = path.join(OUTPUT_DIR, gameName, difficulty)
      fs.mkdirSync(outputDir, { recursive: true })

      const puzzles = []
      for (let i = 0; i < PUZZLE_COUNT; i++) {
        const seed = Date.now() + i
        const puzzle = engine.generate(difficulty, seed)
        puzzles.push(puzzle)
      }

      const outputPath = path.join(outputDir, 'puzzles.json')
      fs.writeFileSync(outputPath, JSON.stringify(puzzles, null, 2))
      console.warn(`[generate] ${gameName}/${difficulty}: ${puzzles.length}問 → ${outputPath}`)
    }
  } catch {
    console.error(`[generate] ${gameName} のエンジンが見つかりません。スキップします。`)
  }
}

async function main(): Promise<void> {
  console.warn(`[generate] 対象ゲーム: ${TARGET_GAMES.join(', ')}`)
  console.warn(`[generate] 各難易度 ${PUZZLE_COUNT}問 生成`)

  for (const game of TARGET_GAMES) {
    await generateForGame(game)
  }

  console.warn('[generate] 完了')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
