# PuzzleVault - ClaudeCode 指示書

## プロジェクト概要

React Native (Expo Managed Workflow) で作るパズルゲームアプリ。
10種類のゲームを収録。iOS/Android両対応、広告収益モデル、完全オフラインプレイ可能。

- アプリ名: **PuzzleVault**
- プラットフォーム: iOS / Android
- フレームワーク: React Native + Expo SDK
- 言語: TypeScript (strict mode)

## 技術スタック

| レイヤー | 採用技術 |
|---|---|
| フレームワーク | React Native + Expo SDK |
| 画面遷移 | Expo Router (file-based) |
| 状態管理 | Zustand + React Query |
| ローカルDB | expo-sqlite |
| アニメーション | Reanimated + Gesture Handler |
| テスト | Jest |
| CI/CD | GitHub Actions + EAS Build |

## ディレクトリ構成

```
PuzzleVault/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml        # PR時: TypeCheck/Test
│   │   ├── build.yml     # mainマージ時: EASビルド
│   │   ├── generate.yml  # 問題自動生成
│   │   └── claude.yml    # ClaudeCode自動開発
│   └── CLAUDE.md         ← このファイル
├── app/                  # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx     # ゲーム選択ホーム
│   │   └── settings.tsx
│   └── games/
│       ├── sudoku/
│       └── [game]/
├── src/
│   ├── engines/          # ゲームロジック（純粋TS）
│   ├── components/       # 共通UIコンポーネント
│   ├── stores/           # Zustand stores
│   ├── hooks/
│   ├── services/
│   └── types/
├── scripts/              # 問題生成スクリプト
├── data/                 # バンドル問題データ（JSON）
└── docs/md/              # 設計書
```

## コーディング規約

- TypeScript strict mode 必須。**`any` 型禁止**
- ゲームロジックは `src/engines/` 以下に**純粋TypeScript関数**として実装
- React Native コンポーネントとゲームロジックは必ず分離する
- 副作用はカスタムフックに閉じ込める
- `console.log` 残留禁止（`console.warn` / `console.error` はOK）
- 未使用 import 禁止
- コメントは日本語OK

## ゲームエンジン実装ルール

各ゲームのエンジンは `src/engines/{name}/` に以下の構成で実装する:

```typescript
// generator.ts: 問題生成（決定論的seed対応必須）
export function generate(difficulty: Difficulty, seed?: number): Puzzle

// solver.ts: 解法検証（一意解チェック用）
export function solve(puzzle: Puzzle): Puzzle | null
export function countSolutions(puzzle: Puzzle): number

// validator.ts: ユーザー入力の合否判定
export function validate(state: GameState, move: Move): ValidationResult

// types.ts: 型定義
// index.ts: エクスポート
```

- 各エンジンには `src/engines/{name}/__tests__/{name}.test.ts` のJestテストを必ず作成
- 1問あたりの生成時間は **500ms以内**（Normalまで）
- seed値で同一問題を再現できること
- テストでは各Difficultyで10問生成し全問解けることを確認

## 共通型定義

`src/types/engine.ts` を参照:

```typescript
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

export interface ValidationResult {
  correct: boolean
  isComplete: boolean
  lifeLost: boolean
}
```

## 広告実装ルール

- バナー広告: ゲーム画面下部に常時配置
- インタースティシャル: クリア後30%の確率で表示
- リワード動画: ヒント追加取得時
- `settingsStore.isPurchased` が true の場合は広告非表示

## PRルール

- タイトル: `[ClaudeCode] #{issue番号} {内容}`
- テストが通らない場合はPRを作成しない
- mainブランチへの直接pushは禁止
- ターゲットブランチ: `develop`

## 参照すべきドキュメント

| ドキュメント | パス |
|---|---|
| 全体設計書 | `docs/md/architecture.md` |
| 自動化マニュアル | `docs/md/automation.md` |
| ナンプレ仕様 | `docs/md/games/sudoku.md` |
| イラストロジック仕様 | `docs/md/games/nonogram.md` |
| ソリティア仕様 | `docs/md/games/solitaire.md` |
| クイーンズマスター仕様 | `docs/md/games/queens.md` |
| Libra仕様 | `docs/md/games/libra.md` |
| Panda仕様 | `docs/md/games/panda.md` |
| Hashi仕様 | `docs/md/games/hashi.md` |
| Seven仕様 | `docs/md/games/seven.md` |
| スパイダソリティア仕様 | `docs/md/games/spider.md` |
| Sums仕様 | `docs/md/games/sums.md` |
