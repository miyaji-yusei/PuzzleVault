import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'

/**
 * 広告を表示してよい環境かどうか。
 * - Web: react-native-google-mobile-ads はネイティブモジュールのため非対応
 * - Expo Go: ネイティブモジュールが含まれないため非対応（development build が必要）
 *
 * react-native-google-mobile-ads 自体の import は、ここではなく
 * AdBanner コンポーネント側で adsEnabled === true のときだけ遅延読み込みする。
 */
export const adsEnabled =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient

/** ANCHORED_ADAPTIVE_BANNER のおおよその高さ（幅依存、目安） */
export const AD_BANNER_HEIGHT_ESTIMATE = 60
