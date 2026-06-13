import { Platform } from 'react-native'
import * as ScreenOrientation from 'expo-screen-orientation'

/**
 * Webでは画面回転ロックの概念がなく lockAsync/unlockAsync は未サポートのため、
 * ネイティブ(iOS/Android)でのみ実際のAPIを呼び出す
 */
export function lockPortrait(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve()
  return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
}

export function unlockOrientation(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve()
  return ScreenOrientation.unlockAsync()
}
