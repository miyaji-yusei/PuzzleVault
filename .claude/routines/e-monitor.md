# Routine E: パイプライン監視・改善 (Manager Phase 1)

## ブランチルール
- 監視: GitHubのIssue/PRを確認するだけ（ブランチ操作なし）
- プロンプト改善・ログ記録: `develop` ブランチで作業
- `main` は確認のみ・変更しない

## 手順

### フェーズ1: 異常検知・復旧

1. **キュー枯渇チェック**
   `gh issue list --label claude --state open --json number` が0件の場合:
   `gh issue create --title "[監視] キュー枯渇: claudeラベルIssueが0件" --label monitoring-alert --body "Issue補充が必要です。Managerの次回Phase2で補充されます。"`

2. **スタック検知**
   `gh issue list --label in-progress --state open --json number,title,updatedAt` で確認:
   - `updatedAt` から24時間以上経過したIssueを検知する
   - `gh issue edit {番号} --add-label claude --remove-label in-progress`
   - `gh issue comment {番号} --body "[Routine E] 24時間以上進捗なし。claudeキューに再投入しました。"`

3. **PR放置チェック**
   `gh pr list --base develop --state open --json number,title,createdAt` で確認:
   - `createdAt` から72時間以上経過したPRを検知する
   - `gh pr comment {番号} --body "[Routine E] 72時間以上マージされていません。Workerが次回レビューします。"`

4. **CI連続失敗チェック**
   `gh pr list --base develop --state open --json number,title` で各PRのコメント履歴を確認:
   - "fix: レビュー修正" コミットが3回以上あるPRを検知する
   - `gh pr edit {番号} --add-label do-not-merge`
   - `gh issue create --title "[監視] CI連続失敗: PR #{番号}" --label monitoring-alert --body "手動確認が必要です。do-not-mergeラベルを付与しました。"`

5. **PR本文品質チェック**
   `gh pr list --base develop --state open` で各PRの本文を確認:
   - 「🎮 このPRで遊べるようになるゲーム」がなければ追記する
   - `gh pr edit {番号} --body "{更新した本文}"`

---

### フェーズ2: プロンプト改善

6. 直近の活動を確認する:
   `gh issue list --state all --json number,title,comments,updatedAt --limit 30`

7. 繰り返し発生しているエラーパターンを特定する（例: 同じエラーで修正が3回以上発生）

8. 改善が必要な場合:
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

9. 異常が見つからなかった場合:
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
