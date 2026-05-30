# ClaudeCode 自動開発基盤 セットアップ・運用マニュアル

**PuzzleVault** | Windows + GitHub Actions  
Version 1.0 | 2025年6月

---

## 1. 自動化コンポーネント一覧

| コンポーネント | トリガー | 内容 |
|---|---|---|
| `ci.yml` | PR・push時 | Lint / TypeCheck / Unit Test / E2E |
| `build.yml` | mainブランチマージ時 | EAS BuildでiOS/Androidバイナリ生成 |
| `generate.yml` | 毎日03:00 JST (cron) | パズル問題をバッチ生成しPR作成 |
| `claude.yml` | `claude`ラベル付きIssue | ClaudeCodeが自動実装しPR作成 |

---

## 2. 前提条件

### 2.1 必要なアカウント

| サービス | 用途 | 取得先 |
|---|---|---|
| GitHub | ソースコード管理・Actions・Issues | github.com（無料） |
| Anthropic Console | ANTHROPIC_API_KEY取得 | console.anthropic.com |
| Expo / EAS | クラウドビルド | expo.dev（無料枠あり） |
| Apple Developer | App Store公開 | developer.apple.com（年間¥13,800） |
| Google Play Console | Google Play公開 | play.google.com（初回$25） |
| AdMob | 広告収益 | admob.google.com（無料） |

### 2.2 ローカル環境（Windows）

```powershell
# 必要なツール
# - Node.js 20 LTS: https://nodejs.org/
# - Git: https://git-scm.com/
# - Visual Studio Code

# ClaudeCode CLIインストール
npm install -g @anthropic-ai/claude-code

# EAS CLIインストール
npm install -g eas-cli
```

---

## 3. セットアップ手順（M0）

### 3.1 Expoプロジェクト初期化

```powershell
# プロジェクト作成
npx create-expo-app puzzle-vault --template blank-typescript
cd puzzle-vault

# 必要パッケージ一括インストール
npx expo install expo-router react-native-safe-area-context react-native-screens
npx expo install expo-linking expo-constants expo-sqlite expo-updates
npx expo install @react-native-async-storage/async-storage
npx expo install @shopify/react-native-skia
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install react-native-google-mobile-ads
npx expo install expo-iap
npm install zustand @tanstack/react-query
npm install -D typescript @types/react jest @testing-library/react-native eslint
```

### 3.2 EAS設定

```powershell
# Expoアカウントでログイン
eas login

# プロジェクト初期化（eas.json生成）
eas build:configure
```

`eas.json` の推奨設定:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@email.com" },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

### 3.3 GitHub Secrets登録

GitHubリポジトリ → Settings → Secrets and variables → Actions → **New repository secret**

| Secret名 | 値・取得方法 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys から生成 |
| `EXPO_TOKEN` | expo.dev → Access Tokens から生成 |
| `APPLE_ID` | Apple Developer アカウントのメールアドレス |
| `APPLE_TEAM_ID` | Apple Developer → Membership から確認 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Play Console → APIアクセスから生成したJSONの内容 |

### 3.4 ワークフローファイル配置

`.github/workflows/` に以下の4ファイルを作成する。

#### ci.yml

```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
```

#### build.yml

```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive --profile production
```

#### generate.yml

```yaml
name: Puzzle Generation
on:
  schedule:
    - cron: '0 18 * * *'   # 毎日03:00 JST
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - name: Generate puzzles
        run: npx ts-node scripts/generate-puzzles.ts
        env:
          PUZZLE_COUNT: 100
          DIFFICULTY_LEVELS: easy,normal,hard,expert
      - name: Validate puzzles
        run: npx ts-node scripts/validate-puzzles.ts
      - name: Create PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: '[Auto] 問題データ更新 ${{ github.run_id }}'
          branch: 'auto/puzzles-${{ github.run_number }}'
          commit-message: 'chore: auto-generate puzzle data'
```

#### claude.yml

```yaml
name: ClaudeCode Auto Development
on:
  issues:
    types: [labeled]
  workflow_dispatch:
    inputs:
      issue_number: { required: true }

jobs:
  implement:
    runs-on: ubuntu-latest
    if: contains(github.event.issue.labels.*.name, 'claude')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm install -g @anthropic-ai/claude-code
      - name: Run ClaudeCode
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          claude --issue ${{ github.event.issue.number }} \
                 --create-pr \
                 --allowedTools 'Edit,Write,Bash,Read'
```

---

## 4. ClaudeCode 運用ガイド

### 4.1 ローカルでの使用

```powershell
# APIキーを設定（初回のみ）
$env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxx"

# プロジェクトルートで起動
cd C:\path\to\puzzle-vault
claude

# 使用例:
# > src/engines/sudoku/generator.ts を実装して
# > docs/md/games/sudoku.md の仕様に従ってナンプレエンジンを実装して
# > app/games/sudoku/index.tsx のUIを実装して
```

### 4.2 GitHub Actions経由の自動実装フロー

```
1. GitHubでIssueを作成
2. Issue本文に実装指示を記載（下記テンプレート参照）
3. Issueに 'claude' ラベルを付与
4. GitHub Actionsが自動起動
5. ClaudeCodeが実装 → PRを自動作成
6. CI（ci.yml）が自動実行
7. 人間がPRをレビュー → developへマージ
```

### 4.3 Issue テンプレート（ゲームエンジン実装用）

```markdown
## [ClaudeCode] {ゲーム名} エンジン実装

### 実装対象
`src/engines/{name}/` 配下に以下を実装してください。
仕様は `docs/md/games/{name}.md` を参照してください。

### 実装ファイル
- [ ] `generator.ts` - 問題生成（seed対応）
- [ ] `solver.ts` - 解法・一意解チェック
- [ ] `validator.ts` - ユーザー入力検証
- [ ] `types.ts` - 型定義
- [ ] `index.ts` - エクスポート
- [ ] `__tests__/engines/{name}.test.ts` - テスト

### テスト要件
- 各Difficultyで100問生成して全問解けることを確認
- 一意解チェックが正しく動くことを確認
- validateの正誤判定が正しいことを確認
- 生成時間: 1問あたり500ms以内

### 完了条件
- `npm run typecheck` でエラーなし
- `npm test` で全件パス
- CLAUDE.md のコーディング規約に準拠
```

### 4.4 問題生成の手動実行

```powershell
# GitHub CLI で手動実行
gh workflow run generate.yml

# ローカルでテスト実行（10問のみ）
$env:PUZZLE_COUNT = "10"
npx ts-node scripts/generate-puzzles.ts
```

---

## 5. トラブルシューティング

| 問題 | 対処法 |
|---|---|
| ClaudeCodeがIssueを処理しない | `claude`ラベルが付いているか確認。`ANTHROPIC_API_KEY`がSecretsに登録されているか確認 |
| EASビルドが失敗する | `EXPO_TOKEN`の有効期限を確認。`eas.json`の設定を見直す |
| 問題生成がタイムアウトする | `PUZZLE_COUNT`を減らす。アルゴリズムの最大試行回数を確認 |
| TypeScriptエラーでCIが失敗する | `any`型が使われていないか確認。型定義ファイルを見直す |
| 一意解チェックが遅い | 500msタイムアウトを超える問題は棄却するよう実装する |
| 広告が表示されない | AdMobのアプリIDが`app.json`に設定されているか確認 |

---

## 6. M0完了チェックリスト

以下が全て完了したらPhase 1の開発を開始できる。

- [ ] GitHubリポジトリ作成（`puzzle-vault`）
- [ ] Expoプロジェクト初期化（`npx create-expo-app`）
- [ ] TypeScript strict mode有効化（`tsconfig.json` で `"strict": true`）
- [ ] `.github/CLAUDE.md` 配置
- [ ] `ci.yml` 配置・PR作成でActions動作確認
- [ ] `build.yml` 配置・EAS連携確認
- [ ] `generate.yml` 配置・`workflow_dispatch`で手動実行確認
- [ ] `claude.yml` 配置・`claude`ラベルIssueでPR自動作成確認
- [ ] `ANTHROPIC_API_KEY` をSecrets登録
- [ ] `EXPO_TOKEN` をSecrets登録
- [ ] AdMob アプリID取得・`app.json`設定
- [ ] ESLint + Prettier設定（`npm run lint` が通る）
- [ ] Jest基本設定（`npm test` が通る）
- [ ] ナンプレIssue発行 → ClaudeCodeがPR作成（Phase 1開始）
