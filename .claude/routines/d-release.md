# Routine D: リリース判断 (Manager Phase 3)

## ブランチルール
- 確認ブランチ: `develop`（src/engines/の状態確認・品質チェック）
- リリースPR: `develop → main`（`gh pr create --base main --head develop`）
- `main` への直接pushは絶対禁止
- リリースPRをマージするのは人間（自動マージしない）

## 完了ゲームの定義
以下のいずれかに該当するIssueは「完了」とカウントする:
- `completed` ラベルが付いているIssue
- `closed` 状態のIssue（ユーザー手動クローズ含む）
- 対応するPR（`claude/{番号}`ブランチ）がmergedになっているIssue

## 手順

1. `.claude/last-release-check` ファイルを確認する
   - ファイルが存在し、前回記録のcompleted数と現在が同じなら「変化なし、スキップ」と出力して終了する
   - ファイルが存在しないか、completed数が増えていれば次のステップへ進む

2. **完了ゲーム数を正確にカウントする**:
   ```bash
   # completedラベルまたはcloseされたgame実装Issueを全取得
   gh issue list --state all --json number,title,labels,state \
     --jq '[.[] | select(
       (.title | startswith("[ClaudeCode]")) and
       ((.labels[].name == "completed") or (.state == "CLOSED"))
     )] | length'
   ```
   - ゲームエンジン実装Issue（タイトルが "[ClaudeCode]" で始まる）のみカウント
   - monitoring-alertやリリース判断などのシステムIssueは除外する

3. `gh pr list --base main --state open --json number,title` で既存リリースPRを確認する
   - リリースPRが既に存在する場合は「リリースPR #{番号}が既にオープン」と出力して終了する

4. `git checkout develop && git pull origin develop`

5. `ls src/engines/` で実装済みエンジン一覧を確認する

6. 以下の基準で総合判断する:

   **リリース推奨**:
   - Phase1の4ゲーム（sudoku / nonogram / queens / solitaire）の実装ファイルが全て存在し、かつ完了カウントが4以上

   **リリース検討**:
   - 完了ゲームが3件以上 かつ
   - `npm test` が全件パスする かつ
   - `npm run typecheck` がエラーなし

   **リリース不適**:
   - 完了ゲームが2件以下
   → 重複作成を防ぐため、同じ件数での "基準未達" Issueが既に存在しないか確認してから作成する:
     ```bash
     EXISTING=$(gh issue list --label monitoring-alert --state open --json title \
       --jq "[.[] | select(.title | contains(\"基準未達\"))] | length")
     if [ "$EXISTING" -eq 0 ]; then
       gh issue create --title "[リリース判断] 基準未達" --label monitoring-alert \
         --body "完了ゲーム: {N}件。基準（3件以上）に未達のためリリース見送り。"
     fi
     ```
   → `.claude/last-release-check` に現在のcompleted数を書き込んで終了する（重複実行防止）:
     ```bash
     echo "{N}" > .claude/last-release-check
     git add .claude/last-release-check
     git commit -m "chore: リリースチェック記録更新（基準未達）"
     git push origin develop
     ```

7. リリース適と判断した場合:
   - `npm test` を実行して全件パスを確認する
   - `npm run typecheck` を実行してエラーがないことを確認する
   - テストまたはtypecheckが失敗した場合は「品質チェック失敗、リリース見送り」と出力して終了する

8. リリースPRを作成する:
   ```bash
   gh pr create \
     --base main \
     --head develop \
     --label release \
     --title "[Release] v{バージョン}" \
     --body "{PR本文}"
   ```

   PR本文:
   ```
   ## 🎮 このリリースで遊べるゲーム

   | ゲーム名 | 概要 | 難易度 |
   |---|---|---|
   | {ゲーム1} | {概要} | easy/normal/hard/expert |
   | {ゲーム2} | {概要} | easy/normal/hard/expert |

   ---

   ## 📱 ローカルでビルドして確認する手順

   ```bash
   # 1. developブランチをチェックアウト
   git checkout develop && git pull origin develop

   # 2. 依存パッケージをインストール
   npm install --legacy-peer-deps

   # 3. Expo Goアプリで確認（実機が必要）
   npx expo start
   # → スマートフォンのExpo GoアプリでQRコードを読み取る
   ```

   ---

   ## ✅ 品質チェックサマリ

   - TypeScript: エラーなし（npm run typecheck）
   - Jest: 全件パス（npm test）
   - 実装済みゲーム: {N}件
   ```

9. `.claude/last-release-check` に現在のcompleted数を書き込む:
   ```bash
   echo "{N}" > .claude/last-release-check
   git add .claude/last-release-check
   git commit -m "chore: リリースチェック記録更新"
   git push origin develop
   ```
