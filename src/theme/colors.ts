/**
 * PuzzleVault カラーパレット（黒×黄色「財宝の中の雷」テーマ）
 * Claude Designのデザインシステムをベースに、Vault Green系をブラック系に置換したもの。
 */

/** 背景・サーフェス（ダーク基調） */
export const vault = {
  bg: '#0E0E10',
  surface: '#17181B',
  card: '#232428',
  border: '#2E3036',
  borderLight: '#3A3C42',
} as const

/** アクセント（雷の黄 / ゴールド） */
export const gold = {
  accent: '#FFD230',
  deep: '#B27F22',
  dark: '#8C611A',
  paper: '#FBF3E0',
  soft: '#F6E6BF',
} as const

/** テキスト（ダークテーマ向け明色系） */
export const ink = {
  strong: '#F5F4EF',
  body: '#F0EFE9',
  muted: '#C9C7BD',
  faint: '#5E5D57',
  /** 黄色ボタン等、明るい背景上の文字色 */
  onGold: '#1A1505',
} as const

/** セマンティックカラー */
export const semantic = {
  success: '#2FA876',
  danger: '#C9483B',
  warning: '#D29B36',
  info: '#4A90D9',
} as const

/** ゲーム識別色（jewel）。タイルのアイコン背景やアクセントに使用 */
export const jewels = {
  solitaire: '#1F7A5E',
  spider: '#3B6D8F',
  sudoku: '#2D60C4',
  nonogram: '#4A5D54',
  queens: '#7A639B',
  libra: '#4A57C9',
  panda: '#4E944F',
  hashi: '#1E908C',
  sums: '#D86A53',
  gechoout: '#A8553F',
  goita: '#8F6B3B',
  seven: '#8E5FD9',
} as const

export type GameId = keyof typeof jewels

/** カードゲーム盤面（フェルト面）の色 */
export const felt = {
  base: '#143228',
  dark: '#0D241C',
} as const

export const colors = { vault, gold, ink, semantic, jewels, felt } as const
