# Routine C: PRレビュー・修正・マージ (Worker Phase 1)

## ブランチルール
- レビュー対象: `develop` へのPR（`claude/{番号} → develop`）のみ
- 修正作業: PRのheadブランチ（`claude/{番号}`）をcheckout
- マージ先: `develop`（`--base develop` のPRのみ処理）
- `main` へのPRは**触らない**（リリースPRはManagerが管理）

## 手順

1. `develop` へのオープンPRを全件取得する（DraftとReadyの両方）:
   `gh pr list --base develop --state open --json number,title,headRefName,labels,isDraft`

2. PRが0件なら「レビュー対象PR無し」と出力して終了する

3. **各PRを全件処理する**（番号が小さい順）:

   ### a. スキップチェック
   - `do-not-merge` ラベルが付いている場合:
     1. PRのコメントを読んで、なぜ `do-not-merge` が付いているか理由を確認する:
        ```bash
        gh pr view {番号} --json comments --jq '.comments[-5:] | .[].body'
        ```
     2. 理由を読んで対応を判断する:
        - **「先に #{別Issue番号} を対応してから」** という依存関係がある場合:
          → その依存IssueがCLOSED/completedか確認する: `gh issue view {別Issue番号} --json state,labels`
          → 依存Issueが完了していなければスキップ（次回Workerで再確認）
          → 依存Issueが完了していれば、依存関係は解消されているので次のステップへ進む
        - **コードの不具合・未実装仕様がある場合**:
          → ブランチをcheckoutして問題を修正する（ステップeと同様の手順）
          → 修正完了後に `gh pr edit {番号} --remove-label do-not-merge` でラベルを外す
          → `gh pr comment {番号} --body "指摘事項を修正しました: {修正内容の要約}"` でコメントを残す
          → ステップbへ進む
        - **理由が不明・修正方法がわからない場合**:
          → スキップして次のPRへ（手動確認が必要）
   - `isDraft: true` かつタイトルが `[WIP]` で始まる場合 → 前回セッションの中断PR:
     - ブランチをcheckoutしてコードを確認し、実装が途中であれば継続する
     - 実装が完了していればReadyに変換する（ステップlへ）
     - 実装が途中の場合は実装を完了させてからステップjへ

   ### b. CI状態チェック
   `gh pr checks {番号}` でCI状態を確認する:
   - 全て `pending` または `in_progress` → 「CI実行中、スキップ」と出力して次のPRへ
   - `failure` あり → 差分を確認してtypecheckエラーなど明確な問題を修正してpush（ステップeへ）
     ※ テストの失敗はコードレビューで判断してから修正を検討する
   - 全て `success` → コードレビューへ（ステップcへ）

   ### c. コードレビュー
   `gh pr diff {番号}` で差分を取得してレビューする:
   1. `any` 型が使われていないか
   2. `src/types/engine.ts` の共通型（Difficulty等）を正しく参照しているか
   3. `generator.ts` にseed引数があり同一seedで同一問題を再現できるか
   4. `solver.ts` に `countSolutions()` が実装されているか
   5. `validator.ts` が `ValidationResult` を返しているか
   6. `index.ts` が全関数をエクスポートしているか
   7. テストがDifficulty×10問をカバーしているか
   8. seed再現性テストがあるか
   9. 生成時間500ms以内のテストがあるか
   10. `console.log` が残っていないか（warn/errorはOK）

   ### d. PR本文チェック・補完
   `gh pr view {番号} --json body` でPR本文を確認する:
   - 「🎮 このPRで遊べるようになるゲーム」セクションがなければ追記
   - 「🖥️ ローカルで動作確認する手順」セクションがなければ追記
   - `gh pr edit {番号} --body "{更新した本文}"` で更新する

   ### e. 問題がある場合（CIエラーまたはレビュー指摘）
   ```bash
   git fetch origin
   git checkout {headブランチ名}  # claude/{番号}
   # 問題を修正する
   npm run typecheck
   npm test -- --testPathPattern={ゲーム名}
   git add -A && git commit -m "fix: レビュー修正 - {修正内容の要約}"
   git push origin {headブランチ名}
   ```
   `gh pr review {番号} --comment --body "レビュー指摘を修正しました: {修正内容}"` でコメントを残す
   「CI再実行待ち。次回Workerで再確認します」と出力してこのPRの処理を終了する

   ### f. マージ前のIssueコメント確認（重要）
   PR本文の `Closes #{Issue番号}` からIssue番号を特定し、最新コメントを確認する:
   ```bash
   gh issue view {Issue番号} --json comments --jq '.comments[-3:] | .[].body'
   ```
   - 最新コメントに「🚨」「do-not-merge」「未解決」「対応されていない」等のキーワードがある場合:
     → `gh pr edit {番号} --add-label do-not-merge` を付与してスキップする
     → `gh pr comment {番号} --body "[Worker] Issueに未解決事項があります。対応後にdo-not-mergeラベルを外してください。"` を追記
   - 最新コメントが追加仕様・修正要求の場合:
     → その内容を実装してからマージする（トークン不足なら次回Workerに持ち越す）

   ### g. マージ（CI success + 問題なし + PR本文完備 + Issueコメント確認済み）
   ```bash
   gh pr merge {番号} --squash --delete-branch
   ```
   - PR本文の `Closes #{Issue番号}` からIssue番号を取得する
   - Issue番号が特定できた場合:
     ```bash
     gh issue edit {Issue番号} --add-label completed --remove-label in-progress --remove-label claude
     gh issue close {Issue番号} --comment "PR #{番号} のマージにより実装完了。"
     ```
   - Issue番号が特定できない場合: PRタイトルの `#{番号}` からIssue番号を推測して同様に処理する
   - 「PR #{番号} をdevelopにマージし、Issue #{Issue番号} をcompletedでクローズしました」と出力する
