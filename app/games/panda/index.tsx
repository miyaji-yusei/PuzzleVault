import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { PandaBoard } from '../../../src/components/games/panda/Board'
import { usePandaGame } from '../../../src/hooks/usePandaGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, InfoBanner } from '../../../src/components/ui'
import { vault, semantic, fontSize, radii } from '../../../src/theme'

export default function PandaScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, tapCell, dragCross, dragRemoveCross, fixError, confirmedCells, errorCell, lives, isComplete, isGameOver, restart } =
    usePandaGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Panda" lives={lives} onRestart={restart} />
      <InfoBanner text="笹（固定）の隣に各1つだけパンダを配置。パンダ同士は隣接不可。行・列の数ヒントを参考に。" />

      <View style={styles.boardContainer}>
        <PandaBoard
          state={state}
          confirmedCells={confirmedCells}
          errorCell={errorCell}
          onPressCell={tapCell}
          onDragCross={dragCross}
          onDragRemoveCross={dragRemoveCross}
        />
      </View>

      {errorCell && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>パンダの配置が間違っています</Text>
          <TouchableOpacity style={styles.fixButton} onPress={fixError}>
            <Text style={styles.fixButtonText}>修正</Text>
          </TouchableOpacity>
        </View>
      )}

      <InfoBanner text="タップ: 候補 → パンダ → 消去 ／ ドラッグ: 候補をまとめて塗る" />

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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3A2425',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: semantic.danger,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: semantic.danger,
    fontWeight: '600',
  },
  fixButton: {
    backgroundColor: semantic.danger,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  fixButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSize.sm,
  },
})
