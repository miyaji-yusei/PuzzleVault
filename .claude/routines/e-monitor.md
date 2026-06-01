# Routine E: パイプライン監視・改善 (Manager Phase 1)

## ブランチルール
- 監視: GitHubのIssue/PRを確認するだけ（ブランチ操作なし）
- プロンプト改善・ログ記録: `develop` ブランチで作業
- `main` は確認のみ・変更しない

## 手順

### フェーズ1: 異常検知・復旧

1. **マージ済みPRのIssue状態修復**（最優先チェック）
   ```bash
   # in-progress または claude ラベルのIssueを全件取得
   gh issue list --label in-progress,claude --state open --json number,title,labels
   ```
   各Issueについて `gh pr list --head claude/{番号} --state all --json number,state,mergedAt` を確認する:
   - PRが `merged` → Issueをcompleted + close:
     ```bash
     gh issue edit {番号} --add-label completed --remove-label in-progress --remove-label claude
     gh issue close {番号} --comment "[Monitor] PR #{PR番号}がマージ済みのため完了としてクローズしました。"
     ```
   - PRが `closed`（未マージ）でIssueが `in-progress` → claudeに再キュー:
     ```bash
     gh issue edit {番号} --remove-label in-progress --add-label claude
     gh issue comment {番号} --body "[Monitor] PRがクローズされています。Workerキューに再投入しました。"
     ```
   - PRが存在しない + Issueが `in-progress` → claudeに再キュー:
     ```bash
     gh issue edit {番号} --remove-label in-progress --add-label claude
     gh issue comment {番号} --body "[Monitor] PR未作成のまま中断されています（トークン切れの可能性）。Workerキューに再投入しました。"
     ```
   - PRが存在しない + Issueが `claude` → 正常（Workerが未処理）→ そのまま

2. **キュー枯渇チェック**
   ```bash
   gh issue list --label claude --state open --json number
   ```
   が0件の場合:
   - `gh issue create --title "[監視] キュー枯渇: claudeラベルIssueが0件" --label monitoring-alert --body "Issue補充が必要です。このManagerセッションのPhase2で補充されます。"`
   - **注意**: このフラグは後続のPhase2（a-issue-refill）で必ず処理すること。キュー枯渇の場合Phase2はスキップせずに実行する。

   1件以上の場合（キュー正常）:
   - open の「キュー枯渇」アラートが残っていれば解決済みとしてクローズする:
     ```bash
     gh issue list --label monitoring-alert --state open --json number,title
     ```
     タイトルが `[監視] キュー枯渇` で始まるIssueを検出した場合:
     ```bash
     gh issue close {番号} --comment "[Monitor] キューが補充されたため解決済みとしてクローズしました。"
     ```

3. **スタック検知**（24時間以上更新なし）
   ```bash
   gh issue list --label in-progress --state open --json number,title,updatedAt
   ```
   - `updatedAt` から24時間以上経過: ステップ1の修復処理と重複するためスキップ（ステップ1で対処済み）

4. **PR放置チェック**（72時間以上open）
   ```bash
   gh pr list --base develop --state open --json number,title,createdAt,isDraft
   ```
   - `createdAt` から72時間以上経過したdraft PRを検知:
     `gh pr comment {番号} --body "[Monitor] 72時間以上Draftのままです。Workerが次回対応します。"`
   - 72時間以上経過したready PRを検知:
     `gh pr comment {番号} --body "[Monitor] 72時間以上マージされていません。Workerが次回レビューします。"`

5. **CI連続失敗チェック**
   ```bash
   gh pr list --base develop --state open --json number,title
   ```
   各PRについてコミット履歴を確認:
   - `"fix: レビュー修正"` コミットが3回以上あるPRを検知:
     `gh pr edit {番号} --add-label do-not-merge`
     `gh issue create --title "[監視] CI連続失敗: PR #{番号}" --label monitoring-alert --body "手動確認が必要です。do-not-mergeラベルを付与しました。"`

6. **PR本文品質チェック**
   ```bash
   gh pr list --base develop --state open --json number,body,isDraft
   ```
   - isDraft=falseのPRで「🎮 このPRで遊べるようになるゲーム」がなければ追記:
     `gh pr edit {番号} --body "{更新した本文}"`

---

### フェーズ2: プロンプト改善

7. 直近の活動を確認する:
   ```bash
   gh issue list --state all --json number,title,comments,updatedAt --limit 30
   gh pr list --state all --json number,title,comments,state --limit 20
   ```

8. 繰り返し発生しているエラーパターンを特定する（例: 同じエラーで修正が3回以上発生）

9. 改善が必要な場合:
   ```bash
   git checkout develop && git pull origin develop
   ```
   対応する `.claude/routines/{name}.md` を改善する（手順の明確化・エラー処理の追加）
   ```bash
   git add .claude/routines/{name}.md
   git commit -m "improve: {RoutineName}プロンプトを改善 - {改善理由}"
   git push origin develop
   ```
   `gh issue create --title "[改善] {RoutineName}プロンプト更新" --label monitoring-alert --body "改善内容: {内容}\n改善理由: {理由}"`

---

### フェーズ3: 正常確認ログ

10. 異常が見つからなかった場合:
    ```bash
    git checkout develop && git pull origin develop
    ```
    `.claude/monitor-log.md` を読む（存在しない場合は作成）
    末尾に `{ISO8601日時}: 全チェック正常` を追記する
    ```bash
    git add .claude/monitor-log.md
    git commit -m "chore: 監視ログ更新"
    git push origin develop
    ```
    「パイプライン正常稼働中」と出力して終了する
