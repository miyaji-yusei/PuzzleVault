import { Dimensions, Platform } from 'react-native'

/**
 * Webデスクトップでは window 幅が非常に大きくなり、モバイル前提の
 * 盤面サイズ計算（画面幅いっぱい）だと盤面が画面からはみ出すため、
 * ゲーム盤面のサイズ計算に使う幅をスマホ相当にキャップする
 */
export const MAX_GAME_WIDTH = 480

/** 盤面サイズ計算用の幅。webのみ MAX_GAME_WIDTH でキャップ、nativeは従来どおり */
export function capGameWidth(width: number): number {
  return Platform.OS === 'web' ? Math.min(width, MAX_GAME_WIDTH) : width
}

/** モジュールスコープで画面幅を取る既存パターンの置き換え用 */
export function gameWindowWidth(): number {
  return capGameWidth(Dimensions.get('window').width)
}
