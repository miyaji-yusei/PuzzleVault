# Routine C: PRレビュー・修正・マージ

## 目的
developブランチへのオープンPRをレビューし、問題があれば修正し、品質基準を満たしたらマージする。

## 手順

1. `gh pr list --base develop --state open --json number,title,headRefName,labels` でPR一覧を取得する

2. PRが0件なら「レビュー対象のPRがありません」と出力して終了する

3. 各PRについて以下を実行する（番号が小さい順に処理）:

   ### a. スキップ条件チェック
   - `do-not-merge` ラベルが付いていればスキップ

   ### b. CI状態チェック
   - `gh pr checks {番号}` でCI状態を確認する
   - 全チェックが `pending` または `in_progress` の場合は「CI実行中。次回再チェック」と出力してスキップ
   - 失敗チェックがある場合は詳細を確認して次のステップ（コードレビュー）へ進む

   ### c. コードレビュー
   - `gh pr diff {番号}` で差分を取得する
   - 以下の観点でレビューする:
     1. TypeScript strict準拠（`any`型が使われていないか）
     2. `src/types/engine.ts` の共通型（Difficulty等）を正しく使っているか
     3. `generator.ts` にseed引数があり同一seedで同一問題を再現できるか
     4. `solver.ts` に `countSolutions()` が実装されているか
     5. `validator.ts` が ValidationResult を返しているか
     6. `index.ts` が全関数をエクスポートしているか
     7. テストがDifficulty×10問をカバーしているか
     8. seed再現性テストがあるか
     9. 生成時間500ms以内のテストがあるか
     10. `console.log` が残っていないか（warn/errorはOK）

   ### d. PR本文チェック・補完
   - `gh pr view {番号} --json body` でPR本文を確認する
   - 「🎮 このPRで遊べるようになるゲーム」セクションがなければ追記する
   - 「🖥️ ローカルで動作確認する手順」セクションがなければ追記する
   - `gh pr edit {番号} --body "{更新した本文}"` でPR本文を更新する

   ### e. 問題がある場合（コードレビュー指摘 or CI失敗）
   - `git fetch origin && git checkout {ブランチ名}` でブランチを取得する
   - 問題を修正する
   - `npm run typecheck` でエラーがないことを確認する
   - `npm test -- --testPathPattern={name}` で全件パスすることを確認する
   - `git add -A && git commit -m "fix: Routine Cレビュー指摘を修正"` でコミットする
   - `git push origin {ブランチ名}` でpushする
   - `gh pr review {番号} --comment --body "レビュー指摘を修正しました: {修正内容の要約}"` でコメントを残す
   - 「CI再実行待ち。次回Routine Cで確認します」と出力してこのPRの処理を終了する

   ### f. マージ条件チェック
   以下の全条件を満たす場合のみマージする:
   - CI全チェックが `success`
   - コードレビュー指摘事項なし（または全て修正済み）
   - PR本文に「🎮」「🖥️」セクションがある

   条件を満たす場合:
   - `gh pr merge {番号} --squash --delete-branch --merge-message "[ClaudeCode] #{番号} {タイトル}"` でマージする
   - 対応IssueのIDをPR本文の `Closes #` から取得する
   - `gh issue edit {Issue番号} --add-label completed --remove-label in-progress` でラベルを更新する
   - 「PR #{番号} をdevelopにマージしました」と出力する
