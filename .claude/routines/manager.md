# Manager Routine: 監視 + Issue補充 + リリース判断 + 改善

リポジトリ: https://github.com/miyaji-yusei-fixer/PuzzleVault

## ブランチ共通ルール
- 監視・Issue補充: GitHubのIssue/PR操作のみ（ブランチ操作なし）
- プロンプト改善・リリースチェック: `develop` ブランチで作業
- `main` は確認のみ・直接変更しない

---

## Phase 1: パイプライン監視・異常復旧（e-monitor.md の指示に従う）

`.claude/routines/e-monitor.md` を読み、その指示に従って監視を実行する。

---

## Phase 2: Issue自動補充（a-issue-refill.md の指示に従う）

`.claude/routines/a-issue-refill.md` を読み、その指示に従ってIssue補充を実行する。

---

## Phase 3: リリース判断（d-release.md の指示に従う）

`.claude/routines/d-release.md` を読み、その指示に従ってリリース判断を実行する。

---

## Phase 4: プロンプト自己改善

直近のGitHub活動（Issue/PRコメント）を確認し、以下のチェックリストに沿って改善を判断する。

```bash
git checkout develop && git pull origin develop
gh issue list --state all --json number,title,comments,labels --limit 40
gh pr list --state all --json number,title,comments,state --limit 20
```

### 自動改善チェックリスト

| 検知条件 | 対象ファイル | 改善内容 |
|---|---|---|
| 同一IssueでWIP Draft PRが48h以上放置 | `b-implement.md` | エンジン実装の時間上限を短縮（例: 40分→30分） |
| エンジン実装のfixコミットが3件以上 | `b-implement.md` | 該当エンジンの注意事項を手順に追記 |
| monitoring-alertが5件以上open | `e-monitor.md` | クリーンアップ条件を緩和（例: 7日→3日） |
| UIのIssueが全てclosed/completed | `a-issue-refill.md` | 優先順位をUIフェーズからエンジンフェーズに戻す |
| in-progressの再キューが2回以上繰り返されているIssue | `b-implement.md` | 該当実装の分割（複数Issueに分ける）をコメントで提案 |
| Phase1でPRなしが続いている（3回以上） | `worker.md` | Phase1スキップの時間閾値を調整 |

改善を実施した場合:
```bash
git add .claude/routines/{name}.md
git commit -m "improve: {RoutineName}改善 - {理由}"
git push origin develop
gh issue create --title "[改善] {内容}" --label monitoring-alert --body "改善内容: {詳細}\n検知パターン: {条件}"
```

改善が不要な場合は「Phase4: 改善不要」と出力して終了する。

---

## 注意
- Phase 1 → 2 → 3 → 4 の順に実行する
- `.claude/paused` が存在する場合は全処理をスキップして終了する
