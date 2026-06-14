import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type {
  BannerAd as BannerAdComponent,
  BannerAdSize as BannerAdSizeEnum,
  TestIds as TestIdsType,
} from 'react-native-google-mobile-ads'
import { adsEnabled } from '../../config/ads'

/**
 * 画面下部固定のバナー広告。
 * Expo Go / Web では adsEnabled が false になるため、
 * react-native-google-mobile-ads の読み込み自体を行わず null を返す。
 */
export function AdBanner() {
  const insets = useSafeAreaInsets()

  if (!adsEnabled) return null

  // adsEnabled === true（development build 等）のときだけ読み込む。
  // Expo Go ではネイティブモジュールが存在しないため、トップレベルの
  // import にするとアプリ起動時にエラーになる。
  const { BannerAd, BannerAdSize, TestIds } = require('react-native-google-mobile-ads') as {
    BannerAd: typeof BannerAdComponent
    BannerAdSize: typeof BannerAdSizeEnum
    TestIds: typeof TestIdsType
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BannerAd unitId={TestIds.ADAPTIVE_BANNER} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
})
