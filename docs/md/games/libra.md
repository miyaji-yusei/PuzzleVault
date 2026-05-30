# Libra 仕様書

## 1. ゲーム概要

9×9のグリッドにAとBを配置するバイナリパズル。行・列の制約と隣接制約（×/=）を満たすように全マスを埋める。Everyday Gridsアプリの同名ゲームを参考にした論理パズル。

## 2. ルール

1. **連続制限**: 行・列でAまたはBが3つ以上連続してはいけない
2. **均等配置**: 各行・各列にAとBが同数ずつ入る（9マスの場合: A=4, B=5 または A=5, B=4 … ※9は奇数なので差が1）
   - 実装注意: グリッドサイズを偶数（8×8, 10×10）とすることで各行列が等分になる設計を推奨
3. **一意行列禁止**: どの2行も同じ配置にはできない。どの2列も同じ配置にはできない
4. **隣接制約**: 一部のマス間に記号が定義される
   - `×`: 隣り合う2マスの値が**異なる**（A×B または B×A）
   - `=`: 隣り合う2マスの値が**同じ**（A=A または B=B）
5. 間違えた値を入力するとライフ-1

## 3. 型定義

```typescript
// src/engines/libra/types.ts
export type CellValue = 'A' | 'B' | null
export type ConstraintType = 'eq' | 'neq'  // = または ×

export interface Constraint {
  r1: number; c1: number
  r2: number; c2: number
  type: ConstraintType
}

export interface LibraPuzzle {
  id: string
  size: number              // グリッドサイズ（推奨: 8 or 10）
  initial: CellValue[][]    // 初期配置（nullが空マス）
  solution: CellValue[][]
  constraints: Constraint[] // 隣接制約一覧
  difficulty: Difficulty
  seed: number
}

export interface LibraState extends LibraPuzzle {
  current: CellValue[][]
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface LibraMove {
  row: number
  col: number
  value: CellValue
}
```

## 4. 難易度定義

| Difficulty | グリッドサイズ | 初期開示数 | 制約数 |
|---|---|---|---|
| easy | 6×6 | 40%程度 | 多め |
| normal | 8×8 | 30%程度 | 中程度 |
| hard | 8×8 | 20%程度 | 少なめ |
| expert | 10×10 | 15%程度 | 最小限 |

## 5. 問題自動生成アルゴリズム（制約伝播）

```
1. グリッドサイズを決定
2. バックトラック + 制約伝播でsolutionを生成
   - 連続制限・均等配置・一意行列制約を適用しながら充填
3. 隣接制約をランダムに設置（難易度に応じた数）
4. ランダムにマスを空白化
5. 一意解チェック：制約伝播ソルバーで解が1つかを確認
6. 目標難易度に合うまで繰り返す
```

## 6. UI仕様

```
┌─────────────────────────────┐
│  Libra              ❤❤❤    │
├─────────────────────────────┤
│                             │
│  [N×N グリッド]             │
│  ※マス間に × / = を表示    │
│                             │
├─────────────────────────────┤
│     [A]  [B]  [消しゴム]   │
├─────────────────────────────┤
│  [ヒント]                   │
├─────────────────────────────┤
│  [バナー広告]               │
└─────────────────────────────┘
```

### インタラクション
- マスタップ → A → B → null のサイクル
- または [A]/[B]ボタン選択後タップ
- 制約違反時（連続3つ・不均等等）: 赤ハイライト + ライフ-1
- 制約記号（×/=）はマス間のボーダー上に表示

### 制約記号の視覚表現
- `=`: オレンジ丸（●）をマス間ボーダー中央に表示
- `×`: 赤×印（✕）をマス間ボーダー中央に表示

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: 確定できる1マスの値を表示。リワード広告で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface LibraProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  currentStreak: number
  lastPlayedAt: number
}
```
