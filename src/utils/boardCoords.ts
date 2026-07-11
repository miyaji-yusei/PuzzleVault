import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import type { View, ViewStyle } from 'react-native'

export type PageOrigin = { x: number; y: number }

/**
 * getBoundingClientRect の結果（ビューポート基準）を、Responderイベントの
 * pageX/pageY と同じドキュメント基準の座標に変換する
 */
export function webOriginFromRect(
  rect: { left: number; top: number },
  scrollX: number,
  scrollY: number
): PageOrigin {
  return { x: rect.left + scrollX, y: rect.top + scrollY }
}

/**
 * Viewの原点を、Responderイベントの nativeEvent.pageX/pageY と同じ座標系で測定する。
 *
 * - native: measureInWindow（ウィンドウ基準）= pageX/pageY と一致（非同期コールバック）
 * - web: react-native-web では measureInWindow が getBoundingClientRect（ビューポート
 *   基準・スクロール除外）で実装される一方、pageX/pageY はDOM準拠（ドキュメント基準・
 *   スクロール込み）のため、ページがスクロールすると座標系がズレる。そこで
 *   getBoundingClientRect + window.scrollX/Y でドキュメント基準の原点を同期的に返す。
 */
export function measurePageOrigin(
  view: View | null,
  onMeasured: (origin: PageOrigin) => void
): void {
  if (!view) return
  if (Platform.OS === 'web') {
    // react-native-web では View の ref は DOM 要素そのもの
    const el = view as unknown as { getBoundingClientRect?: () => DOMRect }
    if (typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect()
      const scrollX = typeof window !== 'undefined' ? (window.scrollX ?? 0) : 0
      const scrollY = typeof window !== 'undefined' ? (window.scrollY ?? 0) : 0
      onMeasured(webOriginFromRect(rect, scrollX, scrollY))
      return
    }
  }
  view.measureInWindow((x, y) => onMeasured({ x, y }))
}

/**
 * PanResponder を張る盤面Viewのstyleに追加する。webのみ:
 * - touchAction: 'none' … ドラッグ中にブラウザのスクロール/ズームが奪うのを防ぐ
 *   （react-native-web のdocumentレベルtouchリスナーはpassiveのため preventDefault 不可）
 * - userSelect: 'none' … ドラッグ中のテキスト選択を防ぐ
 */
export const boardTouchFixStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle)
    : {}

/**
 * 盤面原点の測定をまとめたフック。
 * - boardRef を盤面Viewの ref に、onBoardLayout を onLayout に渡す
 * - onPanResponderGrant の先頭で remeasure() を呼ぶと、スクロール/リサイズ/
 *   レイアウトシフト後でも原点が最新になる（webでは同期測定のためgrantイベント
 *   自体に反映される）
 */
export function useBoardOrigin() {
  const boardRef = useRef<View>(null)
  const originRef = useRef<PageOrigin>({ x: 0, y: 0 })

  const remeasure = useCallback(() => {
    measurePageOrigin(boardRef.current, (origin) => {
      originRef.current = origin
    })
  }, [])

  const onBoardLayout = useCallback(() => {
    requestAnimationFrame(remeasure)
  }, [remeasure])

  return { boardRef, originRef, remeasure, onBoardLayout }
}
