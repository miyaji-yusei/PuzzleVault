# Routine A: Issue自動補充

## 目的
claudeラベル付きIssueが不足した場合に未実装ゲームのIssueを自動補充し、パイプラインの入口を維持する。

## 手順

1. `gh issue list --label claude --state open --json number,title` でキューを確認する
2. claudeラベルIssueが2件以上あれば「キューに十分なIssueがあります」と出力して終了する
3. `gh issue list --state all --json number,title,labels` で全Issueを取得し、実装済みゲームを特定する
   - in-progress または completed ラベルがついているIssueのタイトルからゲーム名を抽出する
4. 全10ゲームのリストから未着手のゲームを次の優先順位で選ぶ:
   - Phase1（優先）: sudoku → nonogram → queens → solitaire
   - Phase2: libra → panda → hashi → seven → spider → sums
5. 未着手ゲームのうち先頭から最大2件について、以下を実行する:
   - `docs/md/games/{name}.md` を読んでゲーム仕様を確認する
   - 以下のテンプレートでIssue本文を作成する:

```
## 実装対象

`src/engines/{name}/` 配下に{ゲーム名}のゲームエンジンを実装してください。
仕様は `docs/md/games/{name}.md` を参照してください。

## 実装ファイル

- [ ] `src/engines/{name}/types.ts` - 型定義
- [ ] `src/engines/{name}/generator.ts` - 問題生成（seed対応）
- [ ] `src/engines/{name}/solver.ts` - 解法・一意解チェック
- [ ] `src/engines/{name}/validator.ts` - ユーザー入力検証
- [ ] `src/engines/{name}/index.ts` - エクスポート
- [ ] `src/engines/{name}/__tests__/{name}.test.ts` - Jestテスト

## テスト要件

- 各Difficultyで10問生成して全問解けることを確認
- seed値が同じなら同一問題が生成されることを確認
- 生成時間: 1問あたり500ms以内（Normal難易度まで）

## 完了条件

- `npm run typecheck` でエラーなし
- `npm test -- --testPathPattern={name}` で全件パス
- `.github/CLAUDE.md` のコーディング規約に準拠
```

   - `gh issue create --title "[ClaudeCode] {ゲーム名} ゲームエンジン実装" --label claude --body {本文}` でIssueを作成する
   - 作成したIssue番号をメモする

6. 作成したIssue一覧を出力して終了する
