# Sums 仕様書

## 1. ゲーム概要

グリッドのブロックに指定された合計値になるよう数字を埋める論理パズル。カックロ（Kakuro）に着想を得た数字パズル。

## 2. ルール

- N×Nのグリッド（サイズは難易度で変化）
- グリッドは「ブラックセル」と「ホワイトセル」に分かれる
  - ブラックセル: 合計数字が書かれているヘッダーセル（入力不可）
  - ホワイトセル: 1〜9の数字を入力するセル
- ブラックセルから伸びる連続したホワイトセル群（ラン）に合計が指定される
  - 横方向ラン: ブラックセルの右側数字
  - 縦方向ラン: ブラックセルの下側数字
- **同一ランの中に同じ数字は使えない**
- 全ホワイトセルを埋めてすべての合計が一致したらクリア
- 間違えるとライフ-1

## 3. 型定義

```typescript
// src/engines/sums/types.ts
export type CellValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null

export interface BlackCell {
  type: 'black'
  sumRight?: number   // 横方向ランの合計
  sumDown?: number    // 縦方向ランの合計
}

export interface WhiteCell {
  type: 'white'
  value: CellValue    // 初期はnull
}

export type GridCell = BlackCell | WhiteCell

export interface SumsPuzzle {
  id: string
  size: number
  grid: GridCell[][]
  solution: (CellValue | null)[][]
  difficulty: Difficulty
  seed: number
}

export interface SumsState extends SumsPuzzle {
  current: (CellValue | null)[][]
  notes: Set<number>[][]  // メモ機能
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface SumsMove {
  row: number
  col: number
  value: CellValue
  isNote: boolean
}
```

## 4. 難易度定義

| Difficulty | グリッドサイズ | ホワイトセル数 | 特徴 |
|---|---|---|---|
| easy | 8×8 | 少なめ | 短いランのみ・推論シンプル |
| normal | 10×10 | 中程度 | 標準的なカックロ |
| hard | 13×13 | 多め | 長いラン・複雑な推論 |
| expert | 16×16 | 高密度 | 仮定置きが必要 |

## 5. 問題自動生成アルゴリズム（整数分割）

```
1. グリッドレイアウトをランダム生成（ブラック/ホワイトセルの配置）
2. 各ランに対してsolutionの数字を割り当て（バックトラック）
   - 同ラン内に重複なし
   - 合計制約を満たす
3. solutionから各ランの合計値を計算してBlackCellに設定
4. 一意解チェック：バックトラックソルバーで確認
5. 一意解でない場合はレイアウトを調整して再試行
```

## 6. UI仕様

```
┌──────────────────────────────┐
│  Sums                ❤❤❤   │
├──────────────────────────────┤
│                              │
│  [N×N グリッド]              │
│  黒セル: 合計数字表示        │
│  白セル: 数字入力             │
│                              │
├──────────────────────────────┤
│  [1][2][3][4][5]             │
│  [6][7][8][9][✗]             │
├──────────────────────────────┤
│  [メモ] [ヒント] [戻す]      │
├──────────────────────────────┤
│  [バナー広告]                │
└──────────────────────────────┘
```

### インタラクション
- ホワイトセルタップ → 選択（同ランをハイライト）
- 数字ボタン → 入力
- 間違い: 赤フラッシュ + ライフ-1
- ランの合計が達成されたヘッダー: グレーアウト

### ブラックセルの視覚表現
```
┌───────┐
│   \ 15│  右: 横ランの合計 = 15
│ 7 \   │  左: 縦ランの合計 = 7
└───────┘
```

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: 確定できる1マスの数字を表示。リワード広告で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface SumsProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  currentStreak: number
  lastPlayedAt: number
}
```
