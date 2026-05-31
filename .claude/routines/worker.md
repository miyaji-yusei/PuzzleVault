# Worker Routine: PRレビュー・マージ + 実装

リポジトリ: https://github.com/miyaji-yusei-fixer/PuzzleVault

## ブランチ共通ルール
- 作業ベース: `develop`（常に `git checkout develop && git pull origin develop` から開始）
- PRは必ず `--base develop` を指定
- `main` へ直接pushしない（mainはManagerのリリースPRのみ）

---

## Phase 1: PRレビュー・修正・マージ（c-review-merge.md の指示に従う）

`.claude/routines/c-review-merge.md` を読み、その指示に従ってPRレビューを実行する。

---

## Phase 2: ゲームエンジン実装（b-implement.md の指示に従う）

`.claude/routines/b-implement.md` を読み、その指示に従って実装を実行する。

---

## 注意
- Phase 1 が完了してから Phase 2 に進む
- Phase 1 でトークンを大量消費した場合は Phase 2 の実装件数を減らしてよい
- `.claude/paused` が存在する場合は全処理をスキップして終了する
