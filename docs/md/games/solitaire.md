# ソリティア（クロンダイク）仕様書

## 1. ゲーム概要

52枚のトランプを使った1人用カードゲーム。7列の場札（タブロー）と4つの組み札（ファウンデーション）にカードを整理してクリアを目指す。最もポピュラーなソリティア。

## 2. ルール

### 場札（タブロー）
- 7列。左から1〜7枚（最下段は表向き、その他は裏向き）
- 表向きカードの上に置けるのは**1ランク下の逆色カード**
  （例: 赤の8の上には黒の7）
- 裏向きカードは移動不可。一番下の表向きカードを移動すると次が表向きになる

### 組み札（ファウンデーション）
- 4スート（♠♥♦♣）各1列
- Aから始めてKまで昇順に積む
- 全スートのA〜Kが揃えばクリア

### 山札（ストック）・めくり札（ウェイスト）
- 残り24枚がストックに裏向きで積まれている
- ストックをタップすると1枚（または3枚）めくれてウェイストに表向きになる
- ウェイスト最上段は場札・組み札へ移動可
- ストックが尽きたらウェイストをリセットして再利用可能（回数制限あり）

## 3. 型定義

```typescript
// src/engines/solitaire/types.ts
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
// 1=A, 11=J, 12=Q, 13=K

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface SolitairePuzzle {
  id: string
  seed: number
  drawMode: 1 | 3  // 1枚めくり or 3枚めくり
  difficulty: Difficulty
}

export interface SolitaireState {
  tableau: Card[][]       // [column][card] 場札7列
  foundation: Card[][]    // [suit][card] 組み札4列
  stock: Card[]           // 山札
  waste: Card[]           // めくり札
  moves: number           // 操作回数
  score: number
  stockResets: number     // ストックリセット回数
  startedAt: number
  elapsedSeconds: number
}

export interface SolitaireMove {
  type: 'tableau-to-tableau' | 'tableau-to-foundation' | 'waste-to-tableau'
        | 'waste-to-foundation' | 'stock-draw' | 'stock-reset'
  from?: { pile: 'tableau' | 'waste' | 'foundation'; index: number; cardIndex?: number }
  to?: { pile: 'tableau' | 'foundation'; index: number }
}
```

## 4. 難易度定義

| Difficulty | めくり枚数 | ストックリセット | 特徴 |
|---|---|---|---|
| easy | 1枚 | 無制限 | 初心者向け。クリア率高 |
| normal | 1枚 | 3回まで | 標準設定 |
| hard | 3枚 | 3回まで | 上級者向け |
| expert | 3枚 | 1回のみ | シード固定・最難関 |

## 5. 問題自動生成アルゴリズム

```
1. 52枚のデッキをseedでシャッフル
2. 標準クロンダイク配布ルールで配置
3. クリア可能チェック：シミュレーターで検証
   ※完全なクリア可能性判定は計算コスト大のため
     Easyはクリア可能なseedのみ使用、Hard以上は保証なし
4. データとして seed のみ保存し、起動時に再現
```

## 6. UI仕様

```
┌──────────────────────────────────┐
│  ソリティア    スコア: 1250      │
├──────────────────────────────────┤
│ [♠][♥][♦][♣]    [山札][めくり] │  ファウンデーション + ストック
├──────────────────────────────────┤
│  [列1][列2][列3][列4][列5][列6][列7] │  タブロー
│   ↓    ↓    ↓    ...              │
│  カードが縦に並んで表示           │
├──────────────────────────────────┤
│  [バナー広告]                    │
└──────────────────────────────────┘
```

### インタラクション
- カードタップ: 移動可能な場所へ自動移動（最優先はファウンデーション）
- ドラッグ&ドロップ: 任意の場所へ移動
- 山札タップ: カードをめくる
- ダブルタップ: ファウンデーションへ自動送り
- 有効な移動がない場合: スマートヒント（点滅）

### スコア計算
- カードをファウンデーションへ: +10点
- 裏向きカードを表向きに: +5点
- ウェイスト→場札: +5点
- ストックリセット: -100点（Easyは-0点）
- 1秒経過ごと: -2点（Easyは-0点）

## 7. ヒント仕様

- ヒントボタン: 有効な移動を1つハイライト表示
- 自動補完: ファウンデーションへ全カードが自動送りできる状態で「完成」ボタン表示

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント取得（ライフ機能なし）

## 9. データ保存

```typescript
interface SolitaireProgress {
  totalPlayed: number
  totalCleared: number
  bestScore: Record<Difficulty, number>
  bestTime: Record<Difficulty, number>
  winRate: number
  currentStreak: number
}
```
