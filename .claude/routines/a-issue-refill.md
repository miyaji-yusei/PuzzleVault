# Routine A: Issue自動補充 (Manager Phase 2)

## ブランチルール
- GitHub操作のみ（ブランチ操作不要）
- ファイル確認は develop ブランチの状態を参照

## 実装フェーズの優先順位

現在は **UIフェーズ** を優先する。以下の順でIssueを補充する:

### UIフェーズ（現在優先）
1. `app-foundation` — アプリ基盤（_layout.tsx, タブ, ホーム画面, 設定画面）
2. `sudoku-ui` — ナンプレ画面UI
3. `nonogram-ui` — イラストロジック画面UI
4. `queens-ui` — クイーンズマスター画面UI
5. `libra-ui` — Libra画面UI
6. `panda-ui` — Panda画面UI

### エンジンフェーズ（UIが揃い次第再開）
- solitaire → hashi → seven → spider → sums

## 手順

1. `gh issue list --label claude --state open --json number` でキューを確認する
2. claudeラベルIssueが3件以上あれば「補充不要: {N}件キューあり」と出力して終了する

3. **実装済みタスクを特定する**（以下を全て確認する）:
   ```bash
   gh issue list --state all --json number,title,labels,state
   git checkout develop && git pull origin develop
   ls src/engines/ 2>/dev/null
   ls app/ src/components/ 2>/dev/null
   ```
   以下のいずれかに該当するタスクは「実装済み」とみなす:
   - `completed` ラベルまたは `closed` 状態のIssue
   - `in-progress` / `claude` ラベルのIssue（進行中・待機中）
   - 対応ディレクトリが develop に存在する（`app/(tabs)/`等）

4. 未着手タスクを上記の優先順位で選んでIssueを作成する（3件になるまで）

5. **UIフェーズのIssue本文テンプレート**:

   ### app-foundation（アプリ基盤）
   ```
   ## 実装対象
   アプリの基盤となる画面・ナビゲーション・共通UIを実装してください。
   仕様は `docs/md/architecture.md` を参照してください。

   ## 実装ファイル
   - [ ] `app/_layout.tsx` — Expo Routerルートレイアウト（Stack/Tabs設定）
   - [ ] `app/(tabs)/_layout.tsx` — タブナビゲーション（ホーム・設定）
   - [ ] `app/(tabs)/index.tsx` — ゲーム選択ホーム画面（ゲーム一覧グリッド）
   - [ ] `app/(tabs)/settings.tsx` — 設定画面（サウンド・振動ON/OFF等）
   - [ ] `src/stores/settingsStore.ts` — 設定Zustand store
   - [ ] `src/stores/progressStore.ts` — ゲーム進行状況Zustand store

   ## UI要件
   - ホーム画面: 実装済みゲームをカード形式で一覧表示
   - 各カードはゲーム名・アイコン・難易度選択を含む
   - Expo Router v3 のfile-basedルーティングを使用
   - TypeScript strict mode 必須

   ## 完了条件
   - `npm run typecheck` エラーなし
   - `npx expo start` で画面が表示されること
   ```

   ### {game}-ui（各ゲーム画面）
   ```
   ## 実装対象
   {ゲーム名}のゲームプレイ画面UIを実装してください。
   エンジン（`src/engines/{name}/`）は実装済みです。

   ## 実装ファイル
   - [ ] `app/games/{name}/index.tsx` — ゲーム画面（メインコンポーネント）
   - [ ] `src/components/games/{name}/Board.tsx` — ゲームボード
   - [ ] `src/hooks/use{Name}Game.ts` — ゲーム状態管理フック

   ## UI要件
   - エンジンの `generate(difficulty, seed)` で問題を生成して表示
   - ユーザー入力を受け取り `validate(state, move)` で正誤判定
   - ライフ（残機）表示（上部）
   - 難易度選択から戻れるナビゲーション
   - TypeScript strict mode 必須

   ## 完了条件
   - `npm run typecheck` エラーなし
   - 実機/シミュレータでゲームが遊べること
   ```

6. `gh issue create --title "[ClaudeCode] {タスク名}" --label claude --body {本文}` でIssueを作成する

7. 作成したIssue番号を出力して終了する
