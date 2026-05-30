# スパイダソリティア仕様書

## 1. ゲーム概要

104枚（2デッキ）を使ったソリティアの発展版。場札に同スートのK〜Aを完成させることを目指す。通常のソリティアより難しく、やりごたえがある。

## 2. ルール

### 場札（タブロー）
- 10列。最初は54枚を配置（前4列は6枚、後6列は5枚。各列の一番下のみ表向き）
- 残り50枚は山札としてストックに積む

### カードの移動
- 場札上で順番（降順）に並んだカードのグループを移動可
- どのスートでも降順に積める
- **同スートで連続**しているグループは一括移動可
- 異なるスートでも降順には置けるが一括移動は不可

### 完成セット
- 同スートのKからAまで13枚が降順に揃うと場から取り除かれる（ファウンデーション）
- 8セット（スパイダー = 8本足）完成でクリア

### 山札補充
- ストックから10枚を各列に1枚ずつ配布（ストックが足りない場合は不可）
- 空の列がある場合は補充不可

## 3. 型定義

```typescript
// src/engines/spider/types.ts
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface SpiderPuzzle {
  id: string
  seed: number
  suitCount: 1 | 2 | 4  // 使用スート数（難易度で変化）
  difficulty: Difficulty
}

export interface SpiderState {
  tableau: Card[][]       // [column][card] 場札10列
  stock: Card[][]         // [deal][card] 山札（5回分の配布）
  foundation: number      // 完成したセット数（0〜8）
  moves: number
  undoStack: SpiderState[]
  startedAt: number
  elapsedSeconds: number
}

export interface SpiderMove {
  type: 'move' | 'deal' | 'undo'
  from?: { col: number; cardIndex: number }
  to?: { col: number }
}
```

## 4. 難易度定義

| Difficulty | 使用スート | 特徴 |
|---|---|---|
| easy | ♠ 1スート | 同スートのみ。クリア率高 |
| normal | ♠♥ 2スート | 中程度の難しさ |
| hard | ♠♥♦♣ 4スート | 全スート。本来のスパイダ |
| expert | 4スート | シード固定・高難度配布 |

## 5. 問題自動生成アルゴリズム

```
1. suitCountに応じてデッキを構成（1スートなら♠×8, 2スートなら各4など）
2. seed値でシャッフル
3. 標準配布ルールで配置
4. Easyのみクリア可能seedを事前検証済みリストから選択
```

## 6. UI仕様

```
┌──────────────────────────────────────┐
│  スパイダソリティア  完成: 3/8       │
├──────────────────────────────────────┤
│ [山札] 残り: 3回                     │
├──────────────────────────────────────┤
│ [列1][列2][列3][列4][列5]            │
│ [列6][列7][列8][列9][列10]           │
│  カードが縦に重なって表示             │
├──────────────────────────────────────┤
│  [配布] [戻す] [ヒント]              │
├──────────────────────────────────────┤
│  [バナー広告]                        │
└──────────────────────────────────────┘
```

### インタラクション
- カードタップ: 移動可能な場所へ自動移動
- ドラッグ: 任意列へ移動
- 「配布」ボタン: 山札から各列に1枚ずつ配布
- セット完成時: アニメーションでファウンデーションへ飛ぶ

## 7. ヒント・Undo仕様

- ヒント: 有効な移動を1つハイライト
- Undo: 1手戻る（回数無制限）

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント取得

## 9. データ保存

```typescript
interface SpiderProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  winRate: number
  lastPlayedAt: number
}
```
