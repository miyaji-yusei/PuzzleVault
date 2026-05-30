# Hashi（橋をかけろ）仕様書

## 1. ゲーム概要

島（数字の書かれた円）を橋（線）でつなぐ論理パズル。各島の数字はそこから伸びる橋の本数を示す。全島を1つの連結グラフにすることがゴール。

## 2. ルール

1. 各島（円の中の数字）から、その数だけの橋が出発する
2. 橋は水平または垂直にのみ引ける（斜めは不可）
3. 橋は他の橋や島を通過できない
4. 2つの島の間に引ける橋は最大2本（二重橋）
5. 全ての島は橋でつながれた1つの連結グラフになる
6. 間違えた橋を引くとライフ-1

## 3. 型定義

```typescript
// src/engines/hashi/types.ts
export interface Island {
  id: number
  row: number
  col: number
  bridges: number  // 必要な橋の本数（1〜8）
}

export interface Bridge {
  from: number     // Island.id
  to: number       // Island.id
  count: 1 | 2     // 橋の本数
}

export interface HashiPuzzle {
  id: string
  gridSize: number    // グリッドサイズ
  islands: Island[]
  solution: Bridge[]
  difficulty: Difficulty
  seed: number
}

export interface HashiState extends HashiPuzzle {
  current: Bridge[]   // ユーザーが引いた橋
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface HashiMove {
  fromIslandId: number
  toIslandId: number
  action: 'add' | 'remove'  // タップで橋0→1→2→0のサイクル
}
```

## 4. 難易度定義

| Difficulty | グリッドサイズ | 島の数 | 特徴 |
|---|---|---|---|
| easy | 7×7 | 10〜15 | 単純な推論 |
| normal | 10×10 | 20〜30 | 中程度の推論 |
| hard | 13×13 | 35〜50 | 複雑な連結確認が必要 |
| expert | 16×16 | 55〜70 | 高難度・仮定置きが必要 |

## 5. 問題自動生成アルゴリズム（グラフ探索）

```
1. グリッド上にランダムに島を配置
2. 隣接する島ペアを選び橋を引いてグラフ構築
3. 全島が連結かつ橋数が1〜2本の制約を守る
4. 各島の bridges 数を配置した橋の合計から算出
5. 一意解チェック：バックトラックソルバーで確認
6. 一意解でない場合は島または橋を調整して再試行
```

## 6. UI仕様

```
┌──────────────────────────────┐
│  Hashi               ❤❤❤   │
├──────────────────────────────┤
│                              │
│  [グリッド + 島 + 橋]        │
│  島: 数字入り円              │
│  橋: 細線（1本）/太線（2本） │
│                              │
├──────────────────────────────┤
│  [ヒント] [戻す]             │
├──────────────────────────────┤
│  [バナー広告]                │
└──────────────────────────────┘
```

### インタラクション
- 2つの島の間をタップまたはスワイプ: 橋0→1→2→0 のサイクル
- 橋が完成した島（数字通り）: 島をグリーンにハイライト
- 全島完成 + 全体連結: クリア
- 間違いの橋（数字超過など）: 赤ハイライト + ライフ-1

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: 確定できる橋を1本表示。リワード広告で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface HashiProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  currentStreak: number
  lastPlayedAt: number
}
```
