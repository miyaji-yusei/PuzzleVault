# Worker Routine: PRレビュー・マージ + 実装

リポジトリ: https://github.com/miyaji-yusei-fixer/PuzzleVault

## ブランチ共通ルール
- 作業ベース: `develop`（常に `git checkout develop && git pull origin develop` から開始）
- PRは必ず `--base develop` を指定
- `main` へ直接pushしない（mainはManagerのリリースPRのみ）

---

## Phase 1: PRレビュー・修正・マージ（c-review-merge.md の指示に従う）

まずPR数を確認し、0件ならファイルを読まずにPhase 2へ進む（トークン節約）:
```bash
PR_COUNT=$(gh pr list --base develop --state open --json number --jq 'length')
if [ "$PR_COUNT" -eq 0 ]; then
  echo "レビュー対象PR無し。Phase 2へ。"
else
  # .claude/routines/c-review-merge.md を読んで実行する
fi
```

---

## Phase 2: ゲームエンジン実装（b-implement.md の指示に従う）

`.claude/routines/b-implement.md` を読み、その指示に従って実装を実行する。

---

## セッション時間管理

セッション開始時に時刻を記録し、各フェーズ移行時に経過時間を確認する:

```bash
SESSION_START=$(date +%s)
```

### Phase移行の判断基準

| タイミング | 経過時間 | 判断 |
|---|---|---|
| Phase 1完了後 | 50分超 | Phase 2をスキップして終了 |
| Phase 2: 1件目完了後 | 40分超（エンジン実装の場合） | 追加実装せず終了 |
| Phase 2: 1件目完了後 | 70分超（UI実装の場合） | 追加実装せず終了 |

経過時間の確認:
```bash
ELAPSED=$(( $(date +%s) - SESSION_START ))
ELAPSED_MIN=$(( ELAPSED / 60 ))
echo "経過時間: ${ELAPSED_MIN}分"
```

## 注意
- Phase 1 が完了してから Phase 2 に進む
- `.claude/paused` が存在する場合は全処理をスキップして終了する
