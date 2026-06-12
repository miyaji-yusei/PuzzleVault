# Routine A: Issue自動補充 (Manager Phase 2)

## ブランチルール
- GitHub操作のみ（ブランチ操作不要）
- ファイル確認は develop ブランチの状態を参照

## 補充ルール（エンジンとUIを並行）

キューに空きがある場合、以下の優先順位でIssueを補充する:

### 優先順位 (2026-06-12更新)
1. **app-foundation**（未作成かつ `app/(tabs)/` が存在しない場合）
   - 2026-06-12時点で完了済み（対象なし）
2. **完成エンジンのUI**（`src/engines/{name}/` が存在するがUI Issueが未作成かつUI実装オミット対象でないゲーム）
   - 順序: sudoku → nonogram → queens → libra → panda → solitaire → hashi → spider → sums → seven
   - 注意: Seven は Issue #129 で一度UI実装をオミットしたが、Issue #297 で再開済み（`app/games/seven/` が存在しUI Issueがclaude/in-progress/completed/closedのいずれかになっていれば対応済みとみなす）
   - 2026-06-12時点でSeven以外は完了済み
3. **未実装エンジン**（`src/engines/{name}/` が存在しないゲーム）
   - 順序: gechoout → goita
   - 2026-06-12時点で全12エンジン実装済み（対象なし）
4. **フォールバック: 改善・バグ修正Issueからの補充**（上記1〜3が全て完了済み、かつキューが3件未満の場合）
   - `gh issue list --state open --label bug,enhancement --json number,title,labels` で取得したIssueのうち、
     `claude` / `in-progress` / `completed` のいずれのラベルも付いていないものを番号の古い順に選ぶ
   - 選んだIssueに `gh issue edit {番号} --add-label claude` でラベルを付与してキューに追加する（3件になるまで）
   - 該当Issueも無い場合は新規Issueを作成せず「補充対象なし: {既存件数}件のまま」と出力して終了する

※ UI IssueとエンジンIssueを混在させてよい（例: UI 2件 + エンジン 1件）

## 手順

1. `gh issue list --label claude --state open --json number` でキューを確認する
2. claudeラベルIssueが3件以上あれば「補充不要: {N}件キューあり」と出力して終了する

3. **現状を把握する**:
   ```bash
   gh issue list --state all --json number,title,labels,state
   git checkout develop && git pull origin develop
   ls src/engines/
   ls app/games/
   ```
   - 既存Issue（claude/in-progress/completed/closed）のタイトルから「着手済みタスク」を抽出する
   - `src/engines/{name}/` の存在で「エンジン完成ゲーム」を特定する
   - `app/games/{name}/` の存在で「UI完成ゲーム」を特定する
   - `app/(tabs)/` の存在で「app-foundation完了」を確認する

4. 未着手タスクを上記の優先順位1〜3で選んでIssueを作成する（3件になるまで）。
   優先順位1〜3に未着手タスクが無い場合は、優先順位4のフォールバック手順で既存Issueにラベルを付与する。

5. **UIフェーズのIssue本文テンプレート**（優先順位1〜3でIssueを新規作成する場合のみ使用。優先順位4はテンプレート不要）:

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

6. 優先順位1〜3の場合: `gh issue create --title "[ClaudeCode] {タスク名}" --label claude --body {本文}` でIssueを作成する。
   優先順位4の場合: `gh issue edit {番号} --add-label claude` で既存Issueをキューに追加する。

7. 作成・更新したIssue番号を出力して終了する
