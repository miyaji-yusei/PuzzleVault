# クイーンズマスター仕様書

## 1. ゲーム概要

N×Nのグリッドに色分けされた領域があり、各領域に1つずつクイーン（♛）を置くパズル。LinkedInゲーム「Queens」に着想を得た論理パズル。

## 2. ルール

- N×Nのグリッド（Nは難易度で変化: 6〜12）
- グリッドはN個の色付き領域に分割されている
- 各色の領域に正確に1つのクイーンを置く
- クイーンは縦・横・斜めいずれにも隣接してはいけない（8方向すべて）
- 各行・各列にクイーンは1つだけ
- すべての条件を満たす配置を見つければクリア
- 間違えてクイーンを置くとライフ-1

## 3. 型定義

```typescript
// src/engines/queens/types.ts
export type ColorId = number  // 0〜N-1
export type CellState = 'empty' | 'queen' | 'crossed'

export interface QueensPuzzle {
  id: string
  size: number              // グリッドサイズ N
  regions: ColorId[][]      // [row][col] → 色ID
  solution: boolean[][]     // true = クイーン配置
  difficulty: Difficulty
  seed: number
}

export interface QueensState extends QueensPuzzle {
  current: CellState[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface QueensMove {
  row: number
  col: number
  state: CellState
}
```

## 4. 難易度定義

| Difficulty | グリッドサイズ | 特徴 |
|---|---|---|
| easy | 6×6 | 領域形状がシンプル |
| normal | 8×8 | 領域形状が複雑 |
| hard | 10×10 | 複雑な形状・推論多 |
| expert | 12×12 | 最大サイズ・高難度 |

## 5. 問題自動生成アルゴリズム

```
1. N個のクイーン位置をランダムに配置（各行・各列・非隣接条件を満たす）
2. クイーン位置を元に領域を生成（Voronoi分割ベース + 連結性保証）
3. 一意解チェック：バックトラックで解が1つだけか確認
4. 一意解でない場合は領域を調整して再チェック
5. 難易度判定：推論ステップ数で分類
```

## 6. UI仕様

```
┌─────────────────────────┐
│  クイーンズマスター ❤❤❤ │
├─────────────────────────┤
│                         │
│  [N×N カラーグリッド]   │
│                         │
├─────────────────────────┤
│  [ヒント] [消しゴム]    │
├─────────────────────────┤
│  [バナー広告]           │
└─────────────────────────┘
```

### インタラクション
- タップ1回: ×マーク（空白確定）
- タップ2回: ♛クイーン配置
- タップ3回: 空白に戻す
- クイーン配置時に衝突 → 赤フラッシュ + ライフ-1
- 完成した行・列: 薄グレーオーバーレイ

### カラーテーマ
各領域は視認性の高い異なる色で塗り分け（色覚バリアフリー配慮）

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: クイーンを確定できる1マスをハイライト表示。リワード広告で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface QueensProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  currentStreak: number
  lastPlayedAt: number
}
```
