# Routine A: Issue自動補充 (Manager Phase 2)

## ブランチルール
- GitHub操作のみ（ブランチ操作不要）
- ファイル確認は develop ブランチの状態を参照

## 手順

1. `gh issue list --label claude --state open --json number` でキューを確認する
2. claudeラベルIssueが3件以上あれば「補充不要: {N}件キューあり」と出力して終了する

3. **実装済みゲームを特定する**（以下を全て確認する）:
   ```bash
   # completed/in-progressラベルのIssue（open/closed両方）
   gh issue list --state all --json number,title,labels,state
   ```
   以下のいずれかに該当するゲームは「実装済み」とみなす:
   - `completed` ラベルが付いているIssue
   - `closed` 状態のIssue（ユーザー手動クローズ含む）
   - `in-progress` ラベルのIssue（実装進行中）
   - `claude` ラベルのIssue（実装待ちキュー）
   - `src/engines/{name}/` ディレクトリが develop に存在するゲーム:
     ```bash
     git checkout develop && git pull origin develop
     ls src/engines/ 2>/dev/null || echo "（エンジンなし）"
     ```

4. 全10ゲームのリストから未着手のゲームを以下の優先順位で選ぶ（claudeラベルが3件になるまで追加）:
   - Phase1（優先）: sudoku → nonogram → queens → solitaire
   - Phase2: libra → panda → hashi → seven → spider → sums

5. 未着手ゲームについて `docs/md/games/{name}.md` を読んでIssue本文を作成する

6. `gh issue create --title "[ClaudeCode] {ゲーム名} ゲームエンジン実装" --label claude --body {本文}` でIssueを作成する

   Issue本文テンプレート:
   ```
   ## 実装対象
   `src/engines/{name}/` 配下に{ゲーム名}のゲームエンジンを実装してください。
   仕様は `docs/md/games/{name}.md` を参照してください。

   ## 実装ファイル
   - [ ] `src/engines/{name}/types.ts`
   - [ ] `src/engines/{name}/generator.ts` - seed対応必須
   - [ ] `src/engines/{name}/solver.ts` - countSolutions()含む
   - [ ] `src/engines/{name}/validator.ts`
   - [ ] `src/engines/{name}/index.ts`
   - [ ] `src/engines/{name}/__tests__/{name}.test.ts`

   ## テスト要件
   - 各Difficultyで10問生成・全問解けること
   - 同一seedで同一問題が生成されること
   - 生成時間500ms以内（Normal難易度）

   ## 完了条件
   - `npm run typecheck` エラーなし
   - `npm test -- --testPathPattern={name}` 全件パス
   ```

7. 作成したIssue番号を出力して終了する
