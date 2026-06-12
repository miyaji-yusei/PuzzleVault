import { View, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { GechoOutBoard } from '../../../src/components/games/gechoout/Board'
import { useGechooutGame } from '../../../src/hooks/useGechooutGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, InfoBanner } from '../../../src/components/ui'
import { vault } from '../../../src/theme'

export default function GechoOutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, move, isComplete, restart } = useGechooutGame(difficulty)
  const remaining = state.current.length

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Gecho Out" onRestart={restart} />
      <InfoBanner text={`蛇の頭か尾をドラッグして、同じ色の穴に入れよう（残り ${remaining} 匹）`} />

      <View style={styles.boardContainer}>
        <GechoOutBoard state={state} onMove={move} />
      </View>

      <InfoBanner text="● 頭（白い目）／ ▪ 尾（薄い印）をドラッグ" />

      <AppDialog
        visible={isComplete}
        title="🎉 クリア！"
        message="すべての蛇を穴に入れました！"
        actions={[
          { label: 'もう一度プレイ', onPress: restart },
          { label: 'タイトルに戻る', onPress: () => router.back(), variant: 'secondary' },
        ]}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vault.bg,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
})
