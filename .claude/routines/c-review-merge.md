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
   - `do-not-merge` ラベルが付いていればスキップ
   - `isDraft: true` かつタイトルが `[WIP]` で始まる場合 → 前回セッションの中断PR:
     - ブランチをcheckoutしてコードを確認し、実装が途中であれば継続する
     - 実装が完了していれば typecheck + test を実行してReadyに変換する（ステップl相当）
     - 実装が途中の場合は実装を完了させてからステップg以降を実行する

   ### b. CI状態チェック
   `gh pr checks {番号}` でCI状態を確認する:
   - 全て `pending` または `in_progress` → 「CI実行中、スキップ」と出力して次のPRへ
   - `failure` あり → 差分を確認して修正（ステップeへ）
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

   ### f. マージ（CI success + 問題なし + PR本文完備）
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
