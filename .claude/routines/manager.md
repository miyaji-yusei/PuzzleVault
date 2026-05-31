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

直近のGitHub活動（Issue/PRコメント）を確認し、繰り返し発生しているエラーや改善点があれば
`.claude/routines/` 配下の該当ファイルを修正して `develop` ブランチにpushする。

```bash
git checkout develop && git pull origin develop
# 改善内容を .claude/routines/{name}.md に反映
git add .claude/routines/ && git commit -m "improve: {RoutineName}改善 - {理由}" && git push origin develop
```

改善内容はGitHub Issueにコメントで記録する。

---

## 注意
- Phase 1 → 2 → 3 → 4 の順に実行する
- `.claude/paused` が存在する場合は全処理をスキップして終了する
