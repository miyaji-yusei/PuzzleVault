# Routine B: 自動実装

## 目的
claudeラベル付きIssueを1件取得し、ゲームエンジンを実装してPRを作成する。

## 手順

1. `.claude/paused` ファイルが存在する場合は「一時停止中のためスキップします」と出力して終了する

2. `gh issue list --label claude --state open --json number,title,body --jq 'sort_by(.number) | .[0]'` でIssueを1件取得する

3. Issueが取得できない場合は「実装待ちIssueがありません」と出力して終了する

4. 取得したIssueの番号・タイトル・本文を確認し、対象ゲーム名（例: sudoku）を特定する

5. `git checkout develop && git pull origin develop` で最新を取得する

6. `git checkout -b claude/{issue番号}` でブランチを作成する

7. `.github/CLAUDE.md` を読んでコーディング規約を確認する

8. Issue本文に記載された仕様書パス（`docs/md/games/{name}.md`）を読んで仕様を理解する

9. 以下のファイルを実装する:
   - `src/engines/{name}/types.ts` - 型定義（Difficulty等の共通型は `src/types/engine.ts` を参照）
   - `src/engines/{name}/generator.ts` - 問題生成（seed引数必須、同一seedで同一問題を再現）
   - `src/engines/{name}/solver.ts` - 解法・countSolutions()（一意解チェック用）
   - `src/engines/{name}/validator.ts` - ユーザー入力の合否判定
   - `src/engines/{name}/index.ts` - 全関数のエクスポート
   - `src/engines/{name}/__tests__/{name}.test.ts` - Jestテスト

10. テストは以下をカバーすること:
    - 各Difficultyで10問生成して全問解けることを確認
    - 同一seedで同一問題が生成されることを確認
    - countSolutions()が一意解を正しく判定することを確認
    - 生成時間が500ms以内であることを確認（Normal難易度）
    - validateが正誤を正しく判定することを確認

11. `npm run typecheck` を実行しエラーがないことを確認する

12. `npm test -- --testPathPattern={name}` を実行し全件パスすることを確認する

13. エラーがあれば修正してから次に進む（最大3回まで修正を試みる）

14. `git add -A && git commit -m "[ClaudeCode] #{番号} {ゲーム名}エンジン実装"` でコミットする

15. `git push origin claude/{issue番号}` でpushする

16. 以下のテンプレートでPRを作成する:
    `gh pr create --base develop --title "[ClaudeCode] #{番号} {ゲーム名} ゲームエンジン実装" --body "{本文}"`

    PR本文テンプレート:
    ```
    ## 🎮 このPRで遊べるようになるゲーム

    **{ゲーム名}** のエンジンが追加されます。

    ### ゲーム概要
    {仕様書の概要セクションから1〜2文}

    ### 難易度
    easy / normal / hard / expert の4段階

    ---

    ## ✅ 実装内容

    - [x] `src/engines/{name}/generator.ts` - 問題生成（seed対応）
    - [x] `src/engines/{name}/solver.ts` - 解法・一意解チェック
    - [x] `src/engines/{name}/validator.ts` - ユーザー入力検証
    - [x] `src/engines/{name}/types.ts` - 型定義
    - [x] `src/engines/{name}/index.ts` - エクスポート
    - [x] `src/engines/{name}/__tests__/{name}.test.ts` - Jestテスト

    ---

    ## 🖥️ ローカルで動作確認する手順

    ```bash
    # 1. このブランチをチェックアウト
    git fetch origin
    git checkout claude/{issue番号}

    # 2. 依存パッケージをインストール
    npm install --legacy-peer-deps

    # 3. エンジン単体テストを実行
    npm test -- --testPathPattern={name}

    # 4. 型チェックを実行
    npm run typecheck

    # 5. 問題を1問生成して内容を確認（オプション）
    npx ts-node -e "
    const engine = require('./src/engines/{name}');
    const puzzle = engine.generate('normal', 12345);
    console.log(JSON.stringify(puzzle, null, 2));
    "
    ```

    ---

    Closes #{番号}
    ```

17. `gh issue edit {番号} --add-label in-progress --remove-label claude` でIssueのラベルを更新する
