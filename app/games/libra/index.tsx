import { View, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LibraBoard } from '../../../src/components/games/libra/Board'
import { useLibraGame } from '../../../src/hooks/useLibraGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, InfoBanner } from '../../../src/components/ui'
import { vault } from '../../../src/theme'

export default function LibraScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, pressCell, lives, isComplete, isGameOver, flashWrongCell, restart } = useLibraGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Libra" lives={lives} onRestart={restart} />
      <InfoBanner text="全マスに太陽か月を入力。行・列3連続禁止、均等配置。= 同じ ／ × 異なる" />

      <View style={styles.boardContainer}>
        <LibraBoard state={state} onPressCell={pressCell} flashWrongCell={flashWrongCell} />
      </View>

      <InfoBanner text="タップ: 太陽 → 月 → 消去（1秒後に判定）" />

      <AppDialog
        visible={isComplete}
        title="🎉 クリア！"
        message="おめでとうございます！"
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
    padding: 12,
  },
})
