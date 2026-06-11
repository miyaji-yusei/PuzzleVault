/**
 * タイポグラフィ。フォントは app/_layout.tsx でロードされる
 * （Zen Kaku Gothic New = 本文 / Outfit = 見出し・英数字）。
 * ロード失敗時はシステムフォントにフォールバックするため、
 * fontFamily は undefined 許容の関数経由で参照する。
 */

export const fontFamily = {
  body: 'ZenKakuGothicNew_400Regular',
  bodyBold: 'ZenKakuGothicNew_700Bold',
  display: 'Outfit_700Bold',
  displayMedium: 'Outfit_500Medium',
} as const

/** タイプスケール（デザインシステム: 11/13/15/17/20/24/38/62） */
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  display: 38,
  hero: 62,
} as const
