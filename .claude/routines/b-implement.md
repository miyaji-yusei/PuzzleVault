# Routine B: ゲームエンジン実装 (Worker Phase 2)

## ブランチルール
- ベース: `develop`（必ず `git checkout develop && git pull origin develop` から開始）
- 作業ブランチ: `claude/{issue番号}`（developから切る）
- PRターゲット: `develop`（`--base develop` 必須）
- `main` には絶対に触らない

## 手順

1. `.claude/paused` ファイルが存在する場合は「一時停止中」と出力して終了する

2. claudeラベルIssueを全件取得する:
   `gh issue list --label claude --state open --json number,title,body --jq 'sort_by(.number)'`

3. Issueが0件なら「実装待ちIssueなし」と出力して終了する

4. **実装上限ルール**（Issue種別 × 経過時間で判断）:

   | Issue種別 | 1セッション上限 | 1件完了後の継続条件 |
   |---|---|---|
   | エンジン実装（「ゲームエンジン実装」を含む） | 1件 | 継続しない（必ず終了） |
   | UI実装（「UI」「基盤」「foundation」を含む） | 2件 | 経過70分未満なら継続 |

   1件目完了後に必ず経過時間を確認する:
   ```bash
   ELAPSED_MIN=$(( ( $(date +%s) - SESSION_START ) / 60 ))
   echo "1件目完了。経過時間: ${ELAPSED_MIN}分"
   ```

   **30分経過チェックポイント**（実装ループ内で定期確認）:
   各ファイルの実装が一段落したタイミング（例: generator.ts完成時、solver.ts完成時）で経過時間を確認する:
   ```bash
   ELAPSED_MIN=$(( ( $(date +%s) - SESSION_START ) / 60 ))
   if [ $ELAPSED_MIN -ge 30 ]; then
     # 未コミットの変更があれば中間コミット
     git add -A
     git diff --cached --quiet || git commit -m "[WIP] #{番号} {ゲーム名} 実装中 (${ELAPSED_MIN}分経過)"
     git push origin claude/{Issue番号}
     echo "中間コミット完了（${ELAPSED_MIN}分経過）"
   fi
   ```
   → Draft PRが作成済みであればpush後にGitHub上で自動反映される。トークン切れになっても作業途中のコードが保存される。

5. **実装ループ**（上記ルールに従う）:

   各Issueについて以下を実行:

   a. `git checkout develop && git pull origin develop`
   b. `git checkout -b claude/{Issue番号}`
   c. `.github/CLAUDE.md` を読んでコーディング規約を確認する
   d. Issue本文に記載された仕様書パス（`docs/md/games/{name}.md`）を読む
   e. 以下のファイルを実装する:
      - `src/engines/{name}/types.ts` - 型定義（`src/types/engine.ts` の Difficulty等を参照）
      - `src/engines/{name}/generator.ts` - seed引数必須、同一seedで同一問題を再現
      - `src/engines/{name}/solver.ts` - solve() と countSolutions()
      - `src/engines/{name}/validator.ts` - ValidationResult を返す
      - `src/engines/{name}/index.ts` - 全関数をエクスポート
      - `src/engines/{name}/__tests__/{name}.test.ts` - Jestテスト
   f. テストは以下をカバーする:
      - 各Difficultyで10問生成して全問解けることを確認
      - 同一seedで同一問題が生成されることを確認
      - countSolutions()の一意解チェックが正しいことを確認
      - 生成時間が500ms以内（Normal）
      - validateが正誤を正しく判定することを確認
   g. `npm run typecheck` を実行してエラーがないことを確認する
   h. `npm test -- --testPathPattern={name}` を実行して全件パスすることを確認する
   i. エラーがある場合は修正する（最大3回）
   j. `git add -A && git commit -m "[WIP] #{番号} {ゲーム名}エンジン実装中"`
   k. `git push origin claude/{Issue番号}`
   k2. **Draft PRを即座に作成する**（トークン切れ時のコード消失防止）:
       ```bash
       DRAFT_PR_URL=$(gh pr create --base develop --draft \
         --title "[WIP] #{番号} {ゲーム名} ゲームエンジン実装" \
         --body "作業中のDraft PRです。実装完了後にReadyに変換します。\n\nCloses #{番号}")
       echo "Draft PR作成: $DRAFT_PR_URL"
       ```
   k3. **Draft PR作成確認**（作成直後に必ず検証する）:
       ```bash
       VERIFY_PR=$(gh pr list --head claude/{Issue番号} --base develop --json number --jq '.[0].number' 2>/dev/null)
       if [ -z "$VERIFY_PR" ]; then
         gh issue comment {番号} --body "[エラー] Draft PR作成に失敗しました。このIssueをWorkerキューに再投入します。次回のWorkerで再実装されます。"
         gh issue edit {番号} --remove-label in-progress --add-label claude
         continue  # 次のIssueに進む
       fi
       echo "PR #$VERIFY_PR の作成を確認しました"
       ```
       → PR作成確認後、実装を継続する。以降のpushは自動的にこのPRに反映される。
   l. テスト・typecheck通過後、Draft PRをReadyに変換して本文を更新する:
      ```bash
      gh pr ready {PR番号}
      # Draft解除確認（失敗時はキューに再投入してスキップ）
      READY_CHECK=$(gh pr view {PR番号} --json isDraft --jq '.isDraft')
      if [ "$READY_CHECK" = "true" ]; then
        gh issue comment {番号} --body "[エラー] gh pr ready に失敗しました。Workerキューに再投入します。"
        gh issue edit {番号} --remove-label in-progress --add-label claude
        # このIssueをスキップして次のIssueへ
      else
        gh pr edit {PR番号} \
          --title "[ClaudeCode] #{番号} {ゲーム名} ゲームエンジン実装" \
          --body "{完成したPR本文（下記テンプレート）}"
      fi
      ```
      PR本文（Readyに変換時に設定）:

      PR本文:
      ```
      ## 🎮 このPRで遊べるようになるゲーム

      **{ゲーム名}** のエンジンが追加されます。

      ### ゲーム概要
      {仕様書の概要から1〜2文}

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
      git checkout claude/{Issue番号}

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

   m. `gh issue edit {番号} --add-label in-progress --remove-label claude`

6. 実装した件数とPR番号を記録する:
   `gh issue comment {最後のIssue番号} --body "Worker実行完了: {N}件実装しました\n作成PR: #{PR番号1}, #{PR番号2}..."`
   （PR番号が不明な場合は `gh pr list --head claude/{番号} --json number --jq '.[0].number'` で確認してから記録する）
