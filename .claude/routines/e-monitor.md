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
   - PRが `open` + Issueが `claude` → Workerがラベル更新漏れ → in-progressに修正:
     ```bash
     gh issue edit {番号} --remove-label claude --add-label in-progress
     gh issue comment {番号} --body "[Monitor] PR #{PR番号}がオープン中ですがclaudeラベルのままでした。in-progressに修正しました。"
     ```
   - PRが存在しない + Issueが `claude` → 正常（Workerが未処理）→ そのまま

1.5. **do-not-mergeラベル付きPR + in-progress Issueの再キュー**
   ```bash
   gh pr list --base develop --state open --json number,title,headRefName,labels
   ```
   ブランチ名が `claude/{番号}` パターンで `do-not-merge` ラベルが付いているPRについて、対応するIssueが `in-progress` の場合:

   **【重要】再キュー前に後継PRの存在を確認する**:
   同じIssue番号に対して、`do-not-merge` PR以外のオープンPRが存在しないか確認する:
   ```bash
   gh pr list --base develop --state open --json number,headRefName,body \
     --jq '[.[] | select(.body | contains("Closes #{Issue番号}"))] | length'
   ```
   - 2件以上のPRが当該Issueに紐づく場合（`do-not-merge` PR + 後継PR）→ **スキップ**（後継PRで実装中のため再キュー不要）
   - 1件のみ（`do-not-merge` PRのみ）→ 以下の通り再キュー:
   ```bash
   gh issue edit {Issue番号} --remove-label in-progress --add-label claude
   gh issue comment {Issue番号} --body "[Monitor] PRに do-not-merge ラベルが付いており実装が承認されていません。Workerキューに再投入しました。既存PR #{PR番号}を参考に新しいアプローチで再実装してください。"
   ```
   **注意**: PRはオープンのまま（参考用に保持）。Workerは既存ブランチ（`claude/{番号}`）に新しい実装をforce-pushするか、別の実装方針を検討すること。

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

4.5. **CI環境障害チェック**（インフラ問題による即時失敗の検知）

   ready状態（isDraft=false）のPRを対象に、最新CIランを確認して「30秒未満の即時失敗」が複数PRで発生していないかチェックする:
   ```bash
   gh pr list --base develop --state open --json number,headRefName,isDraft \
     --jq '.[] | select(.isDraft == false) | [.number, .headRefName] | @tsv'
   ```
   各PRの最新CIランを確認:
   ```bash
   gh run list --workflow=ci.yml --branch {headブランチ名} --limit 1 \
     --json status,conclusion,createdAt,updatedAt,databaseId \
     --jq '.[0] | {conclusion, duration: ((.updatedAt | fromdate) - (.createdAt | fromdate))}'
   ```

   **即時失敗と判定する条件**（以下のいずれか）:
   - `conclusion=failure` かつ 実行時間が **30秒未満**
   - `databaseId` が取得できない（ランナー未割り当て）
   - ログ取得を試みると404エラーが返る

   該当PRが **2件以上** → CI環境障害と判定して Issueを作成する:
   ```bash
   EXISTING=$(gh issue list --label monitoring-alert --state open --json title \
     --jq '[.[] | select(.title | contains("CI環境障害"))] | length')
   if [ "$EXISTING" -eq 0 ]; then
     gh issue create \
       --title "[監視] CI環境障害: 全PRで即時失敗を検知（インフラ問題）" \
       --label monitoring-alert \
       --body "対象PR: {番号リスト}\n\n複数のPRで30秒未満のCI即時失敗を検知しました。GitHub Actionsのランナーが割り当てられていない（runner_id=0）インフラ側の問題の可能性があります。\n\n**Workerへの指示**: このIssueが未クローズの間、CIが30秒未満で失敗しているPRはコード修正を試みずスキップしてください。"
   fi
   ```

   CI環境障害Issueが既に存在する場合:
   - 最新CI実行が30秒以上で完了していれば → 「環境回復」としてIssueをクローズする:
     ```bash
     gh issue close {監視Issue番号} --comment "[Monitor] CIランが正常に完了したため、環境障害は解消されたと判断します。"
     ```

   → CI環境障害と判定した場合でも他のチェック（ステップ5・6）は続行する。

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

### フェーズ1.5: 古いmonitoring-alertのクリーンアップ

7. 解決済み・古いアラートIssueをクローズする:
   ```bash
   gh issue list --label monitoring-alert --state open --json number,title,createdAt
   ```
   以下の条件に該当するIssueをクローズする:
   - タイトルが `[リリース判断] 基準未達` → 同じタイトルが複数あれば古い方をクローズ
   - タイトルが `[改善]` → 対応する `.claude/routines/*.md` が既に改善済みであればクローズ
   - タイトルが `[監視]` → 該当する異常状態が既に解消されていればクローズ
   - 作成から7日以上経過したIssue → 内容に関わらずクローズ（陳腐化）
   ```bash
   gh issue close {番号} --comment "[Monitor] 解決済み/陳腐化のためクローズしました。"
   ```

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
