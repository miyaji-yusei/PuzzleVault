# Seven（セブン）仕様書

## 1. ゲーム概要

トランプを使ったカードゲーム。7を起点に各スートのカードを昇順・降順に並べていくゲーム。既存WebアプリのReact Native移植。

## 2. ルール

- 52枚のトランプを2〜4人（対AI含む）で配分
- 最初に7を持っているプレイヤーが7を場に出す（4スートの7が出るまで必須）
- 場に出た7を起点に：
  - 上方向（昇順）: 8, 9, 10, J, Q, K
  - 下方向（降順）: 6, 5, 4, 3, 2, A
- 自分のターンに出せるカードがなければパス（パス回数に制限あり）
- 全カードを一番早く出し切ったプレイヤーが勝利

## 3. 型定義

```typescript
// src/engines/seven/types.ts
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
}

export interface SevenPuzzle {
  id: string
  seed: number
  playerCount: 2 | 3 | 4
  passLimit: number   // パス上限回数
  difficulty: Difficulty  // AIの強さ
}

export interface SevenState {
  hands: Card[][]         // [playerIndex][cardIndex]
  field: Record<Suit, { min: Rank; max: Rank }>  // 各スートの展開範囲
  currentPlayer: number
  passCount: number[]     // 各プレイヤーのパス回数
  finished: number[]      // 上がり順
  startedAt: number
  elapsedSeconds: number
}

export interface SevenMove {
  type: 'play' | 'pass'
  card?: Card
}
```

## 4. 難易度定義（AI強さ）

| Difficulty | AI戦略 | 特徴 |
|---|---|---|
| easy | ランダム選択 | 初心者向け |
| normal | グリーディー（自分の手を優先） | 標準AI |
| hard | ミニマックス（相手を妨害） | 上級AI |
| expert | モンテカルロ木探索 | 最強AI |

## 5. 自動生成

- seed値でデッキをシャッフルして配布
- 全ゲームクリア可能（プレイヤーが最善手を打てばかならずクリアできるかは保証しない）
- AIの動きは難易度パラメータで制御

## 6. UI仕様

```
┌──────────────────────────────────┐
│  Seven       残りパス: 3         │
├──────────────────────────────────┤
│  AI1の手札（裏向き）             │
├──────────────────────────────────┤
│  ♠: A ← 7 → K                   │  場札（4スート）
│  ♥: 2 ← 7 → J                   │
│  ♦: 7                            │
│  ♣: 5 ← 7 → 9                   │
├──────────────────────────────────┤
│  [自分の手札]                    │
├──────────────────────────────────┤
│  [出す] [パス]                   │
├──────────────────────────────────┤
│  [バナー広告]                    │
└──────────────────────────────────┘
```

### インタラクション
- 手札カードタップ → 出せる場合はハイライト
- 「出す」ボタン → 選択カードを場に出す
- 「パス」ボタン → パス（残り回数が減る）
- パス回数を超えた場合: ゲームオーバー（罰則設定）
- AIターンはアニメーション付きで自動実行

## 7. AI実装

- easy: ランダムに有効手を選択
- normal: 手持ちカードを最も早く出せる選択
- hard: 相手のパスを誘発する選択（妨害戦略）
- expert: ミニマックス深さ3 + ヒューリスティクス

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: ゲーム終了後30%確率
- リワード: 追加パス権の取得

## 9. データ保存

```typescript
interface SevenProgress {
  totalPlayed: number
  totalWon: number
  winRate: number
  bestRank: number   // 最高上がり順位（1位=最高）
  lastPlayedAt: number
}
```
