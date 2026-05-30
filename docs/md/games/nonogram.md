# イラストロジック（ノノグラム）仕様書

## 1. ゲーム概要

グリッドの行・列に与えられた数字ヒントをもとに、マスを塗りつぶして絵を完成させる論理パズル。ピクロス・お絵かきロジックとも呼ばれる。

## 2. ルール

- N×Nのグリッド（サイズは難易度で変化: 5×5〜20×20）
- 各行・各列にヒント数字が与えられる
- ヒント数字は左から（上から）順に、連続して塗るマスの数を示す
- 各グループの間には最低1マスの空白が必要
- 全マスを正しく塗りつぶすとクリア
- 間違ったマスを塗るとライフ-1

## 3. 型定義

```typescript
// src/engines/nonogram/types.ts
export type CellState = 'empty' | 'filled' | 'crossed'  // crossed = ×マーク

export interface NonogramPuzzle {
  id: string
  size: number              // グリッドサイズ（N×N）
  rowClues: number[][]      // 行ヒント [row][group]
  colClues: number[][]      // 列ヒント [col][group]
  solution: boolean[][]     // true=塗りつぶし
  difficulty: Difficulty
  seed: number
  title?: string            // 完成図の名前（例: "ねこ"）
}

export interface NonogramState extends NonogramPuzzle {
  current: CellState[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface NonogramMove {
  row: number
  col: number
  state: CellState
}
```

## 4. 難易度定義

| Difficulty | グリッドサイズ | ヒントの複雑さ |
|---|---|---|
| easy | 5×5〜8×8 | 単純なパターン・少ないグループ |
| normal | 10×10 | 中程度のグループ数 |
| hard | 15×15 | 多数のグループ・曖昧な箇所あり |
| expert | 20×20 | 高密度・多数の推論ステップ必要 |

## 5. 問題自動生成アルゴリズム

```
1. seed値でランダムなパターン（solution）を生成
2. 生成したsolutionからrowClues/colCluesを計算
3. 一意解チェック：ラインソルバーで解けることを確認
4. 一意解でない場合は棄却し再生成（最大50回）
5. 難易度判定：推論ステップ数で分類
```

### ラインソルバー（一意解チェック用）
- 各行・列を独立に解析
- 確定マスを繰り返し伝播
- 全マス確定 → 一意解あり

## 6. UI仕様

```
┌───────────────────────────────┐
│  イラストロジック  ❤❤❤       │
├────────┬──────────────────────┤
│        │  [列ヒント]          │
│[行ヒント]  [N×N グリッド]    │
│        │                      │
├────────┴──────────────────────┤
│  [ヒント] [消しゴム] [×マーク]│
├───────────────────────────────┤
│  [バナー広告]                 │
└───────────────────────────────┘
```

### インタラクション
- タップ: 塗りつぶし ↔ 空白 トグル
- 長押し: ×マーク（空白確定）
- ドラッグ: 連続塗りつぶし
- 完成行・列のヒント: グレーアウトで達成表示
- 誤タップ時: 赤フラッシュ + ライフ-1

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: 未確定の行または列を1本解いて表示。リワード広告で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface NonogramProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  currentStreak: number
  lastPlayedAt: number
}
```
