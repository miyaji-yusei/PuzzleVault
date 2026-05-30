# PuzzleVault - ClaudeCode 指示書

## プロジェクト概要

React Native (Expo Managed Workflow) で作るパズルゲームアプリ。
11種類のゲームを収録。iOS/Android両対応、広告収益モデル、完全オフラインプレイ可能。

- アプリ名: **PuzzleVault**
- プラットフォーム: iOS / Android
- フレームワーク: React Native 0.74 + Expo SDK 51
- 言語: TypeScript (strict mode)

## 技術スタック

| レイヤー | 採用技術 |
|---|---|
| フレームワーク | React Native 0.74 + Expo SDK 51 |
| 画面遷移 | Expo Router v3 (file-based) |
| 状態管理 | Zustand + React Query |
| ゲーム描画 | React Native Skia |
| アニメーション | Reanimated 3 + Gesture Handler |
| ローカルDB | expo-sqlite + MMKV |
| 広告 | react-native-google-mobile-ads (AdMob) |
| 課金 | expo-iap |
| テスト | Jest + Testing Library + Detox |
| CI/CD | GitHub Actions + EAS Build |

## ディレクトリ構成

```
puzzle-vault/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── build.yml
│   │   ├── generate.yml
│   │   └── claude.yml
│   └── CLAUDE.md          ← このファイル
├── app/                   # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx      # ゲーム選択ホーム
│   │   └── settings.tsx
│   └── games/
│       ├── sudoku/
│       ├── solitaire/
│       └── [game]/
├── src/
│   ├── engines/           # ゲームロジック（純粋TS）
│   │   ├── sudoku/
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── validator.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── .../
│   ├── components/        # 共通UIコンポーネント
│   ├── stores/            # Zustand stores
│   ├── hooks/
│   ├── services/          # 広告・課金・分析
│   └── types/
├── scripts/
│   ├── generate-puzzles.ts
│   └── validate-puzzles.ts
├── data/                  # バンドル問題データ（JSON）
└── docs/
    └── md/                # 設計書（このディレクトリ）
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
```

- 各エンジンには `__tests__/engines/{name}.test.ts` のJestテストを必ず作成
- 1問あたりの生成時間は **500ms以内**（Normalまで）
- seed値で同一問題を再現できること

## 共通型定義

```typescript
// src/types/engine.ts を参照
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

export interface ValidationResult {
  correct: boolean
  isComplete: boolean
  lifeLost: boolean
}
```

## 広告実装ルール

- バナー広告: `<AdBanner position="bottom" />` をゲーム画面下部に配置
- インタースティシャル: クリア後30%の確率で表示（`useInterstitialAd()` hook使用）
- リワード動画: ライフ回復・ヒント取得時（`useRewardedAd()` hook使用）
- 広告除去購入済みユーザーには広告を表示しない（`settingsStore.isPurchased` を確認）

## PRルール

- タイトル: `[ClaudeCode] #{issue番号} {内容}`
- テストが通らない場合はPRを作成しない
- mainブランチへの直接pushは禁止
- 変更ファイルには日本語コメントを追加

## 参照すべきドキュメント

| ドキュメント | パス | 内容 |
|---|---|---|
| 全体設計書 | `docs/md/architecture.md` | 技術スタック・アーキテクチャ |
| 自動化マニュアル | `docs/md/automation.md` | GitHub Actions・CI/CD |
| ナンプレ仕様 | `docs/md/games/sudoku.md` | |
| ソリティア仕様 | `docs/md/games/solitaire.md` | |
| Libra仕様 | `docs/md/games/libra.md` | |
| Seven仕様 | `docs/md/games/seven.md` | 既存WebアプリのRN移植 |
| Hashi仕様 | `docs/md/games/hashi.md` | |
| Panda仕様 | `docs/md/games/panda.md` | |
| クイーンズマスター仕様 | `docs/md/games/queens.md` | |
| Sums仕様 | `docs/md/games/sums.md` | |
| スパイダソリティア仕様 | `docs/md/games/spider.md` | |
| Gecho Out仕様 | `docs/md/games/gechoout.md` | |
| ごいた仕様 | `docs/md/games/goita.md` | |
