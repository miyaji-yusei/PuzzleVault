# Panda 仕様書

## 1. ゲーム概要

4〜8のN×NグリッドにA（固定）が配置されており、ルールに従ってBを配置する論理パズル。各AにはペアとなるBが1つ存在し、行・列のB数ヒントを手がかりに配置を確定させる。

## 2. ルール

1. **Bの数ヒント**: 各行・各列の外側に、その行・列に入るBの数が表示される
2. **Aとのペアリング**: 各Aは縦・横に隣接するBのうち**ちょうど1つ**とペアになる
3. **B同士の非隣接**: B同士は縦・横・斜めいずれにも隣接してはいけない（8方向すべて）
4. **×マーク**: Bが入らないマスにはユーザーが×をマークできる（補助機能）
5. **間違いペナルティ**: Bが入らないマスにBを置くとライフ-1
6. 全マスが確定（Bまたは×）したらクリア

## 3. 型定義

```typescript
// src/engines/panda/types.ts
export type CellContent = 'A' | 'B' | 'empty' | 'crossed'
export type CellFixed = 'A' | null  // 初期配置の固定セル

export interface PandaPuzzle {
  id: string
  size: number              // グリッドサイズ N（4〜8）
  fixed: CellFixed[][]      // 初期のA配置
  rowCounts: number[]       // 各行のB数
  colCounts: number[]       // 各列のB数
  solution: CellContent[][] // 'A' | 'B' | 'empty'
  difficulty: Difficulty
  seed: number
}

export interface PandaState extends PandaPuzzle {
  current: CellContent[][]  // ユーザーが入力中の盤面
  mistakes: number
  hintsUsed: number
  startedAt: number
  elapsedSeconds: number
}

export interface PandaMove {
  row: number
  col: number
  value: 'B' | 'crossed' | 'empty'
}
```

## 4. 難易度定義

| Difficulty | グリッドサイズ | A（パンダ）数 | 特徴 |
|---|---|---|---|
| easy | 4×4 | 4〜5 | 単純な推論のみ |
| normal | 6×6 | 6〜8 | ペアリング推論が必要 |
| hard | 7×7 | 7〜10 | 複数ステップの推論 |
| expert | 8×8 | 10〜14 | 高密度・複雑な推論 |

## 5. 問題自動生成アルゴリズム（ペアリング制約ソルバー）

```
1. グリッドサイズとA数を決定
2. バックトラックでAの配置を決定
3. 各Aに対してペアのBをランダムに割り当て
   - 縦・横に隣接するマスから選択
   - B同士が隣接しない制約を守る
4. 解（solution）確定後、rowCounts/colCountsを計算
5. 一意解チェック：ソルバーで解が1つか確認
6. 一意解でない場合はA配置またはペアを変更して再試行（最大50回）
7. 難易度判定：推論ステップ数で分類
```

## 6. UI仕様

```
┌────────────────────────────────┐
│  Panda                 ❤❤❤    │
├──────┬─────────────────────────┤
│      │  3  1  2  1  2  1       │  列ヒント
│  2   │                         │
│  1   │  [N×N グリッド]         │  行ヒント + 盤面
│  3   │  （Aはパンダアイコン）  │
│  1   │                         │
│  2   │                         │
├──────┴─────────────────────────┤
│  [B配置モード] [×モード] [消す] │
├────────────────────────────────┤
│  [ヒント]                      │
├────────────────────────────────┤
│  [バナー広告]                  │
└────────────────────────────────┘
```

### インタラクション
- B配置モード中にタップ → B配置 / タップ中のBをタップ → 消去
- ×モード中にタップ → ×マーク / ×をタップ → 消去
- Bが入らないマスにBを置いた場合: 赤フラッシュ + ライフ-1
- B同士が隣接した場合: 赤フラッシュ + ライフ-1
- 行・列のBカウントが満たされたらヒント数字をグレーアウト

### ビジュアル
- A: パンダアイコン（🐼 または専用イラスト）
- B: 竹アイコン（🎋 または専用イラスト）
- ×: グレーの×マーク

## 7. ライフ・ヒント仕様

| 難易度 | ライフ | ヒント |
|---|---|---|
| easy | 無限 | 3回 |
| normal | 5 | 3回 |
| hard | 3 | 2回 |
| expert | 3 | 1回 |

ヒント: 確定できる1マスの値（BまたはXを配置）。リワード広告で+1回。

## 8. 広告タイミング

- バナー: ゲーム中常時下部
- インタースティシャル: クリア後30%確率
- リワード: ヒント追加取得時

## 9. データ保存

```typescript
interface PandaProgress {
  totalPlayed: number
  totalCleared: number
  bestTime: Record<Difficulty, number>
  currentStreak: number
  lastPlayedAt: number
}
```
