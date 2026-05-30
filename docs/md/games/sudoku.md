# ナンプレ（数独）仕様書

## 1. ゲーム概要

9×9のグリッドに1〜9の数字を埋めるパズル。各行・各列・各3×3ブロックに同じ数字が重複しないように配置する。

## 2. ルール

- 9×9グリッド（81マス）
- 各行に1〜9が1つずつ入る
- 各列に1〜9が1つずつ入る
- 各3×3ブロック（9個）に1〜9が1つずつ入る
- 初期配置のマスは変更不可
- 一意解が保証される

## 3. 型定義

```typescript
// src/engines/sudoku/types.ts
export type Cell = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null
export type Board = Cell[][] // 9x9

export interface SudokuPuzzle {
  id: string
  board: Board          // 初期盤面（nullが空マス）
  solution: Board       // 完成盤面
  difficulty: Difficulty
  seed: number
}

export interface SudokuState extends SudokuPuzzle {
  current: Board
  notes: boolean[][][]  // [row][col][1-9] メモ機能
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface SudokuMove {
  row: number
  col: number
  value: Cell
  isNote: boolean
}
```

## 4. 難易度定義

| Difficulty | 初期配置数 | 解法テクニック |
|---|---|---|
| easy | 40〜45 | ネイキッドシングルのみ |
| normal | 32〜39 | ヒドゥンシングル |
| hard | 26〜31 | ネイキッドペア・ポインティングペア |
| expert | 20〜25 | X-Wing・Swordfish |

## 5. 問題自動生成アルゴリズム

```
1. バックトラック法で完成盤面生成（seed適用）
2. ランダムにマスを除去
3. 一意解チェック（countSolutions() === 1）
4. 難易度判定：解法テクニックの種類で分類
5. 目標難易度に合うまで繰り返す（最大100回）
```

## 6. UI仕様

```
┌─────────────────────────┐
│  ナンプレ    ❤❤❤        │  ヘッダー
├─────────────────────────┤
│   [9×9 グリッド]        │  メイン盤面
├─────────────────────────┤
│  [1][2][3][4][5]        │  数字入力パッド
│  [6][7][8][9][✗]        │
├─────────────────────────┤
│  [メモ] [ヒント] [戻す] │  操作ボタン
├─────────────────────────┤
│  [バナー広告]           │
└─────────────────────────┘
```

### ハイライト
- 選択セル: 青背景
- 同じ数字セル: 薄青背景
- 同行・同列・同ブロック: 薄グレー背景
- エラーセル: 赤テキスト → ライフ-1

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: 選択マスの正解を表示。リワード広告視聴で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface SudokuProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>  // 秒
  currentStreak: number
  lastPlayedAt: number
}
```
