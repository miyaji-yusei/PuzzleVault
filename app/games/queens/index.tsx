import { View, StyleSheet, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { QueensBoard } from '../../../src/components/games/queens/Board'
import { useQueensGame } from '../../../src/hooks/useQueensGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, InfoBanner } from '../../../src/components/ui'
import { vault } from '../../../src/theme'

export default function QueensScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, placeCross, placeQueen, dragCross, dragRemoveCross, lives, isComplete, isGameOver, restart, flashWrongCell, lastCorrectCell } =
    useQueensGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="クイーンパズル" lives={lives} onRestart={restart} />
      <InfoBanner text="各色領域に1つずつクイーンを配置（同行・同列・隣接不可）" />

      <View style={styles.boardContainer}>
        <QueensBoard
          state={state}
          onPlaceCross={placeCross}
          onPlaceQueen={placeQueen}
          onDragCross={dragCross}
          onDragRemoveCross={dragRemoveCross}
          flashWrongCell={flashWrongCell}
          lastCorrectCell={lastCorrectCell}
        />
      </View>

      <InfoBanner text="タップ: ×印 ／ ダブルタップ: ♛配置 ／ ドラッグ: 複数×" />

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
    padding: 16,
  },
})
