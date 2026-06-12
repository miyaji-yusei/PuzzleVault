# デザイン一新 残作業TODO

PR（claude/design-overhaul ブランチ、do-not-merge）時点での完了状況と残作業。
デザインの出典: Claude Design「PuzzleVault Design System」
https://claude.ai/design/p/ee89c0eb-007d-41d0-9b7d-ddfb6ae831a3
（公開版はエメラルド基調。黒×黄色への変更などのユーザー指摘は本実装側で反映済み）

## 完了済み
- [x] Phase 1: テーマ基盤 `src/theme/`（黒×黄色パレット・タイポグラフィ・spacing/radii/shadows）
- [x] Phase 1: 共有UI `src/components/ui/`（Button / GameHeader / AppDialog(スプリングポップイン) / InfoBanner / GameIcon(白黒SVG) / DifficultySelect）
- [x] Phase 1: `src/utils/difficulty.ts`（VALID_DIFFICULTIES/isDifficulty/ラベルの共通化）
- [x] Phase 1: フォント導入（Zen Kaku Gothic New / Outfit、app/_layout.tsxでロード）
- [x] Phase 2: ホーム画面を黒×金の3列グリッドにリデザイン（白黒SVGアイコン+jewel色、個数固定文言なし）
- [x] Phase 2: タブバー・設定画面のダークテーマ化
- [x] Phase 3: 全11ゲーム画面を共有UI(GameHeader/AppDialog/InfoBanner)に移行
- [x] Phase 4(一部): Libra盤面の☀️🌙→白黒SVG化+ダークテーマ、Panda盤面の🐼🎋→白黒SVG化+ダークテーマ

## 残作業
- [ ] **Phase 4続き: 残りの盤面(Board)のダークテーマ適用**
  - `src/components/games/sudoku/Board.tsx` — 白背景・青ハイライトをvault系に置換
  - `src/components/games/nonogram/Board.tsx` — 同上（塗りマスはコントラスト確保に注意）
  - `src/components/games/queens/Board.tsx` — 色領域はjewel系で彩度を調整、♛はGameIcon('crown')への置換を検討
  - `src/components/games/sums/Board.tsx` / `hashi/Board.tsx` / `gechoout/Board.tsx` / `goita/Board.tsx`
  - `src/components/games/solitaire/Board.tsx` / `spider/Board.tsx` — フェルト面を `felt.base/dark`（src/theme/colors.ts）に統一。カード裏面のデザインを黒×金に
  - 方針: 画面側(app/games/*)は移行済みなので、Boardのハードコード色をテーマ定数（または同等のダーク系hex）に置き換えるだけ。Libra/PandaのBoard.tsxの変更が参考になる
- [ ] **DifficultySelectコンポーネントの適用**（`src/components/ui/DifficultySelect.tsx` は作成済みだが未使用。nonogram/solitaire/spiderの独自難易度選択UIを統一し、他ゲームにも難易度選択を追加する）
- [ ] **Phase 5: 仕上げ**
  - ハードコード色の残りを一掃（`grep -rn "#4A90E2\|#4285f4\|#f5f5f5\|#1b5e20" app src`）
  - solitaire/index.tsx のscatterアニメーション部を別コンポーネントに抽出（可読性）
- [ ] **アプリアイコン差し替え**: assets/icon.png 等を「黒×黄の財宝+雷」デザインに。Claude Designで画像生成→差し替え（コードでは対応不可）
- [ ] **既知の問題（このブランチ起因ではない）**
  - `npm run lint` はESLint v10とeslintrc形式の不整合で動作しない（developでも同様）
  - `npm test` は「No tests found」（jest projects設定とテスト配置の不整合、developでも同様）

## 検証手順
1. `npx expo start` でExpo Go起動
2. ホーム → 3列グリッド・白黒アイコン・黒×金テーマを確認
3. 各ゲームを開いてヘッダー/ダイアログ（スプリングポップイン）/Libra・Pandaの白黒アイコンを確認
4. `npm run typecheck` （現状パス）
