import { View, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { HashiBoard } from '../../../src/components/games/hashi/Board'
import { useHashiGame } from '../../../src/hooks/useHashiGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, InfoBanner } from '../../../src/components/ui'
import { vault } from '../../../src/theme'

export default function HashiScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, lives, isComplete, isGameOver, toggleBridge, restart } = useHashiGame(difficulty)

  const maxLives = difficulty === 'normal' ? 5 : 3

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Hashi" lives={lives} maxLives={maxLives} onRestart={restart} />
      <InfoBanner text="島の数字の分だけ橋を引いて全島をつなごう。タップで橋0→1→2→削除" />

      <View style={styles.boardContainer}>
        <HashiBoard state={state} onToggleBridge={toggleBridge} />
      </View>

      <AppDialog
        visible={isComplete}
        title="🎉 クリア！"
        message="全島をつなぎました！"
        actions={[
          { label: 'もう一度プレイ', onPress: restart },
          { label: 'タイトルに戻る', onPress: () => router.back(), variant: 'secondary' },
        ]}
      />

      <AppDialog
        visible={isGameOver}
        title="💔 ゲームオーバー"
        message="ライフがなくなりました"
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
