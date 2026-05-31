# Routine D: リリース判断

## 目的
completedゲームの数・品質を評価し、リリース価値があると判断したらdevelop→mainへのリリースPRを作成する。

## 手順

1. `gh issue list --label completed --state all --json number,title` でcompleted Issueを取得する

2. `.claude/last-release-check` ファイルを確認する
   - ファイルが存在し、前回記録のcompleted数と現在が同じなら「前回チェックから変化なし」と出力して終了する
   - ファイルが存在しないか、completed数が増えていれば次のステップへ進む

3. `gh pr list --base main --state open --json number,title` で既存リリースPRを確認する
   - リリースPRが既に存在する場合は「リリースPR #{番号} が既にオープンです」と出力して終了する

4. `ls src/engines/` で実装済みエンジン一覧を確認する

5. 以下の基準で総合判断する:

   **リリース推奨（強く推奨）**:
   - Phase1の4ゲーム（sudoku / nonogram / queens / solitaire）が全て completed

   **リリース検討（条件付き）**:
   - completedゲームが3件以上 かつ
   - `npm test` が全件パスする かつ
   - `npm run typecheck` がエラーなし

   **リリース不適**:
   - completedゲームが2件以下
   → `gh issue create --title "[監視] リリース判断: 完了数不足" --label monitoring-alert --body "完了ゲーム数: {N}件。リリース基準（3件以上）に達していません。"` で記録して終了する

6. リリース適と判断した場合:
   - `npm test` を実行して全件パスを確認する
   - `npm run typecheck` を実行してエラーがないことを確認する
   - テストまたはtypecheckが失敗した場合は「品質チェック失敗のためリリース見送り」と出力して終了する

7. リリースPRを作成する:
   ```
   gh pr create --base main --head develop \
     --title "[Release] v{バージョン}" \
     --label release \
     --body "{以下のテンプレート}"
   ```

   PR本文テンプレート:
   ```
   ## 🎮 このリリースで遊べるゲーム

   | ゲーム名 | 概要 | 難易度 |
   |---|---|---|
   | {ゲーム1} | {概要} | easy/normal/hard/expert |
   | {ゲーム2} | {概要} | easy/normal/hard/expert |
   ...

   ---

   ## 📱 ローカルでビルドして確認する手順

   ```bash
   # 1. mainブランチをチェックアウト
   git checkout main && git pull origin main

   # 2. 依存パッケージをインストール
   npm install --legacy-peer-deps

   # 3. Expo Goアプリで確認（実機が必要）
   npx expo start

   # → スマートフォンのExpo GoアプリでQRコードを読み取る
   ```

   ---

   ## ✅ 品質チェックサマリ

   - TypeScript: エラーなし
   - Jest テスト: 全件パス
   - 実装済みゲーム: {N}件
   ```

8. `.claude/last-release-check` に現在のcompleted数を書き込む:
   `echo "{N}" > .claude/last-release-check && git add .claude/last-release-check && git commit -m "chore: リリースチェック記録更新" && git push origin develop`

9. 「リリースPR #{番号} を作成しました」と出力して終了する
