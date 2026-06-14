# Routine A: Issue自動補充 (Manager Phase 2)

## ブランチルール
- GitHub操作のみ（ブランチ操作不要）
- ファイル確認は develop ブランチの状態を参照

## 補充ルール（エンジンとUIを並行）

キューに空きがある場合、以下の優先順位でIssueを補充する:

### 優先順位 (2026-06-14更新)
1. **app-foundation** / **完成エンジンのUI** / **未実装エンジン**
   - 2026-06-14時点で全て完了済み（対象なし）。Phase 1の8ゲーム（sudoku/nonogram/queens/libra/panda/solitaire/hashi/seven）に加え spider/sums/gechoout(Snake Escape)/goita も実装済みで、PR #42（v1.0.0リリース）の対象になっている。
2. **デザイン一新フェーズ（現在優先）**
   - `docs/design-overhaul-TODO.md`（developブランチ）の「残作業」セクションを参照する
   - 2026-06-14時点で対応中/作成済みのIssue: #310（sudoku/nonogram/queens盤面）, #311（sums/hashi/gechoout盤面）, #312（goita盤面+DifficultySelect統一）, #315（solitaire/spider盤面）, #316（Phase5仕上げ: ハードコード色一掃+solitaireアニメーション分割）
   - 上記が全てclosed/completedになり、`docs/design-overhaul-TODO.md`の「残作業」に新たな項目が無ければ、このフェーズは完了とみなし優先順位3へ進む
3. **次フェーズ: 既知の問題対応**（デザイン一新フェーズ完了後）
   - `docs/design-overhaul-TODO.md`「既知の問題（このブランチ起因ではない）」に記載の以下を解消するIssueを作成する:
     - `npm run lint` がESLint v10とeslintrc形式の不整合で動作しない
     - `npm test` が「No tests found」になる（jest projects設定とテスト配置の不整合）
4. **フォールバック: 改善・バグ修正Issueからの補充**（上記1〜3が全て完了済み、かつキューが3件未満の場合）
   - `gh issue list --state open --label bug,enhancement --json number,title,labels` で取得したIssueのうち、
     `claude` / `in-progress` / `completed` のいずれのラベルも付いていないものを番号の古い順に選ぶ
   - 選んだIssueに `gh issue edit {番号} --add-label claude` でラベルを付与してキューに追加する（3件になるまで）
   - 該当Issueも無い場合は新規Issueを作成せず「補充対象なし: {既存件数}件のまま」と出力して終了する

※ 複数フェーズのIssueを混在させてよい（例: デザイン一新2件 + 次フェーズ1件）

## 手順

1. `gh issue list --label claude --state open --json number` でキューを確認する
2. claudeラベルIssueが3件以上あれば「補充不要: {N}件キューあり」と出力して終了する

3. **現状を把握する**:
   ```bash
   gh issue list --state all --json number,title,labels,state
   git checkout develop && git pull origin develop
   cat docs/design-overhaul-TODO.md
   ```
   - 既存Issue（claude/in-progress/completed/closed）のタイトルから「着手済みタスク」を抽出する
   - `docs/design-overhaul-TODO.md`の「残作業」セクションの各項目について、対応するIssueが
     `completed`ラベル/`closed`状態/`in-progress`・`claude`ラベルのいずれかに該当するか確認し、
     該当しない項目を「未着手」とみなす

4. 未着手タスクを上記の優先順位2〜3で選んでIssueを作成する（3件になるまで）。
   優先順位2〜3に未着手タスクが無い場合は、優先順位4のフォールバック手順で既存Issueにラベルを付与する。

5. **デザイン一新フェーズのIssue本文テンプレート**（優先順位2でIssueを新規作成する場合に使用。#310, #311, #312, #315, #316 を参考に対象ファイル・配色方針を具体化する）:

   ```
   ## 背景
   デザイン一新（黒×黄色「財宝の中の雷」テーマ、`src/theme/colors.ts`）はホーム画面・タブ・各ゲームの共有UI（GameHeader/AppDialog等）には適用済みですが、以下の対応が残っています。
   `docs/design-overhaul-TODO.md` の「残作業」を参照してください。

   ## 実装対象
   - [ ] {対象ファイルパス（例: src/components/games/{name}/Board.tsx）}

   ## 実装方針
   - `src/theme/colors.ts` のパレット（`vault`/`gold`/`ink`/`jewels`等）を用いて、ハードコードされた旧配色をダークテーマに置き換える
   - 既にダークテーマ対応済みの `src/components/games/libra/Board.tsx`, `src/components/games/panda/Board.tsx` を配色の参考にする
   - 「色による識別」が機能の一部になっている箇所は、識別性を保ったまま暗い配色に置き換える
   - ロジック・状態管理・アニメーションは変更しない（スタイルのみの変更）

   ## 完了条件
   - `npm run typecheck` エラーなし
   - `npm test` 全件パス（UIのみの変更でロジックへの影響がないこと）
   - `npx expo start` で対象画面を開き、黒×金のダークテーマで他画面と統一されていることを確認
   ```

   **次フェーズ（既知の問題対応）のIssue本文テンプレート**（優先順位3でIssueを新規作成する場合に使用）:

   ```
   ## 背景
   `docs/design-overhaul-TODO.md`「既知の問題」に記載の設定不整合を解消してください。

   ## 実装対象
   - [ ] {対象（例: ESLint設定をv10形式に移行 / jest projects設定を修正）}

   ## 完了条件
   - {対象コマンド（npm run lint / npm test）が正常に実行できること}
   ```

6. 優先順位2〜3の場合: `gh issue create --title "[ClaudeCode] {タスク名}" --label claude --body {本文}` でIssueを作成する。
   優先順位4の場合: `gh issue edit {番号} --add-label claude` で既存Issueをキューに追加する。

7. 作成・更新したIssue番号を出力して終了する
