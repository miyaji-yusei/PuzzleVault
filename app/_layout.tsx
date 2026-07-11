import { useEffect } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts } from 'expo-font'
import {
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_700Bold,
} from '@expo-google-fonts/zen-kaku-gothic-new'
import { Outfit_500Medium, Outfit_700Bold } from '@expo-google-fonts/outfit'
import { vault } from '../src/theme'
import { lockPortrait } from '../src/utils/orientation'
import { AdBanner } from '../src/components/ui'

export default function RootLayout() {
  // フォントロード失敗・未完了時もシステムフォントで描画を続行する
  useFonts({
    ZenKakuGothicNew_400Regular,
    ZenKakuGothicNew_700Bold,
    Outfit_500Medium,
    Outfit_700Bold,
  })

  useEffect(() => {
    lockPortrait()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: vault.bg }}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
      <AdBanner />
    </GestureHandlerRootView>
  )
}
