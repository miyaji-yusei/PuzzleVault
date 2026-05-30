# 全体設計書 / アーキテクチャ設計書

**PuzzleVault** | React Native (Expo) + GitHub Actions + ClaudeCode  
Version 1.0 | 2025年6月

---

## 1. プロジェクト概要

### 1.1 目的

11種類のパズルゲームをiOS/Android向けに開発・App Store / Google Playへ公開する。
ウォーターフォール開発手法を採用しつつ、ClaudeCodeおよびGitHub Actionsを活用した自動開発基盤を構築することで、品質を維持しながら開発速度を最大化する。

### 1.2 ゲームタイトル一覧と開発フェーズ

| Phase | ゲーム名 | ジャンル | 問題自動生成 | 工数(h) | 備考 |
|---|---|---|---|---|---|
| 1 | ナンプレ | 数字パズル | ◎完全自動 | 80 | ライブラリ豊富・先行リリース推奨 |
| 1 | ソリティア | トランプ | ◎完全自動 | 120 | 認知度最高 |
| 1 | Seven | トランプ | ◎完全自動 | 100 | 既存WebアプリをRN移植 |
| 1 | Hashi | 論理パズル | ◎完全自動 | 150 | グラフ探索で生成 |
| 2 | Libra | 論理パズル | ◎完全自動 | 160 | 制約伝播アルゴリズム |
| 2 | Panda | 論理パズル | ◎完全自動 | 160 | ペアリング制約ソルバー |
| 2 | Sums | 数字パズル | ◎完全自動 | 150 | 整数分割アルゴリズム |
| 2 | クイーンズマスター | 論理パズル | ◎完全自動 | 170 | N-Queens派生 |
| 2 | スパイダソリティア | トランプ | ◎完全自動 | 140 | ソリティア拡張 |
| 3 | Gecho Out | アクションパズル | △半自動 | 280 | 蛇アニメ・最重量 |
| 3 | ごいた | ボードゲーム | ✕不要 | 240 | AIロジック・通信対戦 |

**総工数目安: 約2,200h（共通基盤300h含む）**

---

## 2. システムアーキテクチャ

### 2.1 技術スタック

| レイヤー | 採用技術 | 選定理由 |
|---|---|---|
| フロントエンド | React Native 0.74 + Expo SDK 51 | Windows開発環境対応。iOS/Android両対応 |
| 状態管理 | Zustand + React Query | 軽量。ゲーム状態管理に最適 |
| ナビゲーション | Expo Router v3 (file-based) | ファイルベースルーティング |
| ゲームエンジン | React Native Skia | 高パフォーマンス2D描画 |
| アニメーション | Reanimated 3 + Gesture Handler | 60fps保証 |
| 広告 | Google AdMob (react-native-google-mobile-ads) | 業界標準。日本語圏eCPM高 |
| 課金 | expo-iap | 広告除去課金。iOS/Android統一API |
| ローカルDB | expo-sqlite + MMKV | 問題データ・進捗保存。オフライン完結 |
| テスト | Jest + Testing Library + Detox | Unit/Integration/E2E三層 |
| CI/CD | GitHub Actions + EAS Build | Windows対応。Expoクラウドビルド |
| 自動化 | ClaudeCode CLI + GitHub Actions | 問題生成・コード生成・レビュー自動化 |
| モニタリング | Sentry + Firebase Analytics | クラッシュ追跡・行動分析 |

### 2.2 ディレクトリ構成

```
puzzle-vault/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # PR時：Lint/Test/型チェック
│   │   ├── build.yml       # mainマージ時：EASビルド
│   │   ├── generate.yml    # 問題自動生成スケジュール
│   │   └── claude.yml      # ClaudeCode自動開発
│   └── CLAUDE.md           # ClaudeCode用プロジェクト指示書
├── app/                    # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx       # ゲーム選択ホーム
│   │   └── settings.tsx
│   └── games/
│       ├── sudoku/
│       ├── solitaire/
│       └── [game]/
├── src/
│   ├── engines/            # ゲームロジック（純粋TS）
│   │   ├── sudoku/
│   │   │   ├── generator.ts
│   │   │   ├── solver.ts
│   │   │   ├── validator.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── .../
│   ├── components/         # 共通UIコンポーネント
│   │   ├── GameBoard/
│   │   ├── AdBanner/
│   │   ├── LifeIndicator/
│   │   └── HintButton/
│   ├── stores/
│   │   ├── gameStore.ts
│   │   ├── settingsStore.ts
│   │   └── progressStore.ts
│   ├── hooks/
│   ├── services/           # 広告・課金・分析
│   └── types/
├── scripts/
│   ├── generate-puzzles.ts
│   └── validate-puzzles.ts
├── assets/
├── data/                   # バンドル問題データ（JSON）
├── docs/
│   └── md/                 # 設計書（Markdown）
├── app.json
├── eas.json
└── package.json
```

---

## 3. 共通アーキテクチャ設計

### 3.1 状態管理設計（Zustand）

| Store名 | 管理する状態 | 主要アクション |
|---|---|---|
| gameStore | 現在のゲーム状態・盤面・ライフ・ヒント残数 | startGame / makeMove / useHint / resetGame |
| progressStore | クリア履歴・統計・連続プレイ日数 | recordClear / getStats / syncToCloud |
| settingsStore | 広告設定・音声・テーマ・課金状態 | toggleAds / setPurchased / updateTheme |

### 3.2 広告実装設計

| 広告形式 | 表示タイミング | 対象ゲーム | 実装 |
|---|---|---|---|
| バナー広告 | ゲーム中常時 | 全ゲーム | `<AdBanner position="bottom" />` |
| インタースティシャル | クリア後（30%確率） | 全ゲーム | `useInterstitialAd()` hook |
| リワード動画 | ライフ回復・ヒント取得 | ライフあり系 | `useRewardedAd()` hook |
| ネイティブ広告 | ゲーム選択一覧 | 共通 | `<NativeAdCard />` |

### 3.3 オフライン対応方針

- **問題データ**: アプリバンドルにJSON形式で同梱（初期300問×ゲーム）
- **追加問題**: 自動生成でOTAアップデート（expo-updates）でサイレント配信
- **進捗データ**: expo-sqlite + MMKVでローカル保存、iCloudはオプション
- **広告**: オフライン時はバナーエリア非表示（レイアウト崩れなし）
- **ごいたAI戦**: 完全オフライン。対人戦はオフライン時に機能無効表示

### 3.4 共通ゲームエンジン インターフェース

```typescript
// src/types/engine.ts

export interface PuzzleGenerator<T> {
  generate(difficulty: Difficulty, seed?: number): T
}

export interface PuzzleSolver<T> {
  solve(puzzle: T): T | null
  countSolutions(puzzle: T): number  // 一意解チェック用
}

export interface MoveValidator<T, M> {
  validate(state: T, move: M): ValidationResult
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

export interface ValidationResult {
  correct: boolean
  isComplete: boolean
  lifeLost: boolean
}
```

---

## 4. 開発フロー（ウォーターフォール + 自動化）

### 4.1 各ゲームの標準開発フロー

| Step | 工程 | 担当 | 成果物 |
|---|---|---|---|
| 1 | 詳細仕様書作成 | 人間（Claude支援） | `docs/md/games/{name}.md` |
| 2 | ClaudeCode Issue発行 | 人間 | GitHubIssue（claudeラベル付き） |
| 3 | エンジン実装（ロジック） | ClaudeCode（自動） | `src/engines/{name}/` |
| 4 | エンジンテスト | ClaudeCode（自動） | `__tests__/engines/{name}.test.ts` |
| 5 | UIコンポーネント実装 | ClaudeCode（自動） | `app/games/{name}/` |
| 6 | 問題生成スクリプト追加 | ClaudeCode（自動） | `scripts/generate-{name}.ts` |
| 7 | 問題データ生成（初期） | GitHub Actions（自動） | `data/{name}/*.json` |
| 8 | 統合テスト・UI確認 | 人間 | テスト結果レポート |
| 9 | EASビルド・TestFlight | GitHub Actions（自動） | ipa/apk |
| 10 | App Store申請 | 人間 | 申請完了 |

### 4.2 ブランチ戦略

| ブランチ名 | 用途 | ルール |
|---|---|---|
| `main` | 本番リリース用 | EASビルドトリガー。直接push禁止 |
| `develop` | 開発統合 | CIが通ったPRのみマージ可 |
| `feature/{name}` | 機能実装 | developへPR |
| `claude/{issue}` | ClaudeCode自動実装 | 自動生成。developへPR |
| `auto/puzzles-{n}` | 問題自動生成 | 自動生成。developへPR |

---

## 5. マイルストーン

| マイルストーン | 期間（目安） | 対象 | 完了条件 |
|---|---|---|---|
| M0: 自動化基盤構築 | 〜2週間 | 共通基盤 | GitHub Actions全ワークフロー稼働。ClaudeCode動作確認 |
| M1: Phase1 リリース | 〜3ヶ月 | 4ゲーム | ナンプレ・ソリティア・Seven・Hashi App Store公開 |
| M2: Phase2 追加 | 〜6ヶ月 | 5ゲーム | Libra・Panda・Sums・クイーンズマスター・スパイダ追加 |
| M3: Phase3 完成 | 〜12ヶ月 | 2ゲーム | Gecho Out・ごいた追加。全11タイトル揃い |
| M4: 収益最適化 | 12ヶ月〜 | 全体 | 広告配置最適化・ASO・MAU目標達成 |
