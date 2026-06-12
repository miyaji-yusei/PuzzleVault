import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SumsBoard } from '../../../src/components/games/sums/Board'
import { useSumsGame } from '../../../src/hooks/useSumsGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, InfoBanner } from '../../../src/components/ui'
import { vault, gold, ink, fontSize } from '../../../src/theme'

export default function SumsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const {
    state,
    isLoading,
    flashCells,
    isComplete,
    isGameOver,
    lives,
    tapCell,
    restart,
  } = useSumsGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Sums" lives={lives} />
      <InfoBanner text="タップで ×→○→空 を切り替え" />

      <ScrollView contentContainerStyle={styles.boardContainer}>
        {isLoading || !state ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={gold.accent} />
            <Text style={styles.loadingText}>問題を生成中...</Text>
          </View>
        ) : (
          <SumsBoard
            state={state}
            flashCells={flashCells}
            onTapCell={tapCell}
          />
        )}
      </ScrollView>

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
        visible={isGameOver && !isComplete}
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
  container: { flex: 1, backgroundColor: vault.bg },
  boardContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: ink.muted,
  },
})
