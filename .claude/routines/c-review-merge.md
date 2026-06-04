# Routine C: PRレビュー・修正・マージ (Worker Phase 1)

## ブランチルール
- レビュー対象: `develop` へのPR（`claude/{番号} → develop`）のみ
- 修正作業: PRのheadブランチ（`claude/{番号}`）をcheckout
- マージ先: `develop`（`--base develop` のPRのみ処理）
- `main` へのPRは**触らない**（リリースPRはManagerが管理）

## ラベルの意味
- `do-not-merge`: 意図的にマージを保留（人間が判断するまで絶対にマージしない）
- `needs-fix`: Workerが自己修正すべき問題がある（修正完了後にラベルを外してマージへ）

---

## 手順

1. `develop` へのオープンPRを全件取得する（DraftとReadyの両方）:
   ```bash
   gh pr list --base develop --state open --json number,title,headRefName,labels,isDraft
   ```

2. PRが0件なら「レビュー対象PR無し」と出力して終了する

3. **各PRを全件処理する**（番号が小さい順）:

   ### a. スキップ・ラベルチェック

   **`do-not-merge` ラベルがある場合**:
   → 無条件でスキップ（理由を確認したり修正したりしない）

   **`needs-fix` ラベルがある場合**:
   1. PRのコメントと対応するIssueの最新コメントを読んで問題を把握する:
      ```bash
      gh pr view {番号} --json comments --jq '.comments[-5:] | .[].body'
      gh issue view {Issue番号} --json comments --jq '.comments[-5:] | .[].body'
      ```
   2. コメントに「先に #XX」「#XX 完了後」「依存」等のキーワードがあるか確認する:
      - **キーワードあり（依存Issueが存在する）**:
        ```bash
        gh issue view {依存Issue番号} --json state,labels --jq '{state:.state, labels:[.labels[].name]}'
        ```
        - `state=OPEN` かつ `completed` ラベルなし
          → **スキップ**（依存Issue未完了）
          ```bash
          gh pr comment {番号} --body "[Worker] 依存Issue #{依存Issue番号} が未完了のためスキップします。完了後に再処理されます。"
          ```
          → 次のPRへ
        - `state=CLOSED` または `completed` ラベルあり
          → 依存解消。コードの問題を修正してラベルを外す（下記ステップ3へ）
      - **キーワードなし（コードの問題のみ）**:
        → コードの問題を修正してラベルを外す（下記ステップ3へ）
        → 修正が複雑でWorkerだけでは対応不可な場合:
          ```bash
          gh pr comment {番号} --body "[Worker] 問題が複雑なため手動対応が必要です: {問題の詳細}"
          ```
          → スキップ
   3. 修正完了後:
      ```bash
      gh pr edit {番号} --remove-label needs-fix
      gh pr comment {番号} --body "[Worker] needs-fixの問題を修正しました: {修正内容の要約}"
      ```
   4. ステップbへ進む（CI確認・レビューを続ける）

   **`isDraft: true` かつタイトルが `[WIP]` で始まる場合** → 前回セッションの中断PR:
   - ブランチをcheckoutしてコードを確認し、実装が途中であれば継続する
   - 実装が完了していればReadyに変換する（ステップlへ）
   - 実装が途中の場合は実装を完了させてからステップjへ

   ---

   ### b. CI状態チェック
   ```bash
   gh pr checks {番号}
   ```
   - 全て `pending` または `in_progress` → 「CI実行中、スキップ」と出力して次のPRへ
   - `failure` あり → 差分とCIログを確認して修正（ステップeへ）
   - 全て `success` → コードレビューへ（ステップcへ）

   ---

   ### c. コードレビュー（強化版）
   ```bash
   gh pr diff {番号}
   ```

   #### c-1. 基本品質チェック
   1. `any` 型が使われていないか（TypeScript strict準拠）
   2. `console.log` が残っていないか（`warn`/`error` はOK）
   3. 未使用importがないか
   4. `src/types/engine.ts` の共通型（`Difficulty`、`ValidationResult` 等）を正しく参照しているか

   #### c-2. ゲームエンジンPRのチェック（`src/engines/` 配下の変更がある場合）
   5. `generator.ts` にseed引数があり同一seedで同一問題を再現できるか
   6. `solver.ts` に `solve()` と `countSolutions()` が実装されているか
   7. `validator.ts` が `ValidationResult` を返しているか
   8. `index.ts` が全関数をエクスポートしているか
   9. テストが以下をカバーしているか:
      - 各Difficultyで10問生成・全問解けること
      - 同一seedで同一問題が生成されること
      - 生成時間500ms以内（Normal）
      - validateが正誤を正しく判定すること

   #### c-3. UI/画面PRのチェック（`app/` 配下の変更がある場合）
   10. 対応するIssueの**全仕様**が実装されているか（Issueコメントの追加仕様も含む）:
       ```bash
       gh issue view {Issue番号} --json body,comments --jq '.body, (.comments[].body)'
       ```
   11. タップ・ドラッグの座標計算に `useSafeAreaInsets()` 等が正しく使われているか
   12. `react-native-reanimated` を使っていないか（Expo Go SDK 54非互換。RN標準の `Animated` APIを使うこと）
   13. ゲームロジック（勝利判定・エラー判定等）とUIが正しく分離されているか
   14. エラーハンドリングが適切か（クラッシュしうる箇所に対処があるか）
   15. 画面遷移（`router.push` 等）が正しく実装されているか

   #### c-4. 共通UI品質チェック
   16. `SafeAreaView` の代わりに `react-native-safe-area-context` を使っているか
   17. ハードコードされた数値（座標・サイズ）がなく `Dimensions.get` や `useWindowDimensions` を使っているか
   18. Keyboardを使うフォームに `KeyboardAvoidingView` があるか（該当する場合）

   ---

   ### d. PR本文チェック・補完
   ```bash
   gh pr view {番号} --json body
   ```
   - 「🎮 このPRで遊べるようになるゲーム」セクションがなければ追記
   - 「🖥️ ローカルで動作確認する手順」セクションがなければ追記
   - `gh pr edit {番号} --body "{更新した本文}"` で更新する

   ---

   ### e. 問題がある場合（CIエラーまたはレビュー指摘）
   ```bash
   git fetch origin
   git checkout {headブランチ名}
   # 問題を修正する
   npm run typecheck
   git add -A && git commit -m "fix: レビュー修正 - {修正内容の要約}"
   git push origin {headブランチ名}
   ```
   - 軽微な修正（型エラー・未使用import等）は自分で直してpushする
   - 大きな仕様変更・設計の問題は `needs-fix` ラベルを付けてコメントを残し、次回Workerに持ち越す:
     ```bash
     gh pr edit {番号} --add-label needs-fix
     gh pr comment {番号} --body "[Worker] 以下の問題があります:\n{問題の詳細}\n修正方針: {方針}"
     ```
   - 「CI再実行待ち。次回Workerで再確認します」と出力してこのPRの処理を終了する

   ---

   ### f. マージ前の最終確認
   PR本文の `Closes #{Issue番号}` からIssue番号を特定し、最新コメントを確認する:
   ```bash
   gh issue view {Issue番号} --json comments --jq '.comments[-3:] | .[].body'
   ```
   - 最新コメントに未対応の仕様追加・修正要求がある場合:
     → その内容を実装するか、`needs-fix` を付けて次回Workerに持ち越す
   - 問題なければステップgへ

   ---

   ### g. マージ（CI success + レビューOK + 最終確認済み）
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
