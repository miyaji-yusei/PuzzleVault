# Routine E: パイプライン監視・改善

## 目的
他のRoutineの動作状況を監視し、異常を検知・復旧する。また各Routineのプロンプトファイルを評価して継続的に改善する。

## 手順

### フェーズ1: 異常検知・復旧

1. **キュー枯渇チェック**
   - `gh issue list --label claude --state open --json number` でclaudeラベルIssueを確認する
   - 0件の場合: `gh issue create --title "[監視] キュー枯渇: Issueが0件" --label monitoring-alert --body "claudeラベルIssueが0件です。Routine Aが動作していない可能性があります。"` で通知する

2. **スタック検知**
   - `gh issue list --label in-progress --state open --json number,title,updatedAt` でin-progress Issueを確認する
   - 最終更新から24時間以上経過したIssueを検知する
   - 検知した場合: `gh issue edit {番号} --add-label claude --remove-label in-progress` でキューに戻す
   - `gh issue comment {番号} --body "[Routine E] 24時間以上進捗なし。claudeキューに再投入しました。"` でコメントを残す

3. **PR放置チェック**
   - `gh pr list --base develop --state open --json number,title,createdAt` でオープンPRを確認する
   - 作成から72時間以上経過したPRを検知する
   - 検知した場合: `gh pr comment {番号} --body "[Routine E] 72時間以上マージされていません。Routine Cが次回実行時にレビューします。"` でコメントする

4. **CI連続失敗チェック**
   - `gh pr list --base develop --state open` で各PRの `gh pr checks {番号}` を確認する
   - CI失敗回数が3回以上のPRを検知する（コメント履歴から "fix: Routine Cレビュー" の回数で判断）
   - 検知した場合:
     - `gh pr edit {番号} --add-label do-not-merge` でラベルを付与する
     - `gh issue create --title "[監視] CI連続失敗: PR #{番号}" --label monitoring-alert --body "PR #{番号} でCI失敗が3回以上発生しています。手動確認が必要です。"` で通知する

5. **PR本文品質チェック**
   - オープンPRの本文に「🎮 このPRで遊べるようになるゲーム」がなければ追記する
   - `gh pr edit {番号} --body "{更新した本文}"` で更新する

---

### フェーズ2: Routineプロンプト改善評価

6. 直近24時間のGitHub活動を確認する:
   - `gh issue list --state all --json number,title,comments,updatedAt --limit 20` でIssueコメントを確認する
   - `gh pr list --state all --json number,title,comments,updatedAt --limit 10` でPRコメントを確認する

7. 繰り返し発生しているエラーパターンを特定する:
   - 例: 「npm test が毎回同じエラーで失敗している」
   - 例: 「PRのマージ後にIssueラベルが更新されていない」
   - 例: 「Routine Bが毎回同じゲームのIssueを処理できていない」

8. エラーパターンが見つかった場合:
   - 対応する `.claude/routines/{name}.md` を読む
   - 問題を解決するように指示を改善する（手順の明確化・エラー処理の追加等）
   - `git checkout develop && git pull origin develop` で最新を取得する
   - 改善した内容を保存する
   - `git add .claude/routines/{name}.md && git commit -m "improve: Routine {X}プロンプトを改善 - {改善理由}"` でコミットする
   - `git push origin develop` でpushする
   - `gh issue create --title "[改善] Routine {X}プロンプト更新" --label monitoring-alert --body "改善内容: {内容}\n改善理由: {理由}"` で記録を残す

---

### フェーズ3: 正常確認ログ

9. 全チェックで異常が見つからなかった場合:
   - `.claude/monitor-log.md` を読む（存在しない場合は作成）
   - 末尾に `{ISO8601日時}: 全チェック正常` を追記する
   - `git add .claude/monitor-log.md && git commit -m "chore: 監視ログ更新" && git push origin develop` で記録する
   - 「パイプライン正常稼働中」と出力して終了する
