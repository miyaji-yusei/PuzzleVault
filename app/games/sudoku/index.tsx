import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SudokuBoard } from '../../../src/components/games/sudoku/Board'
import { useSudokuGame } from '../../../src/hooks/useSudokuGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog } from '../../../src/components/ui'
import { vault, gold, ink, semantic, fontSize, radii } from '../../../src/theme'

export default function SudokuScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const {
    state, selectedCell, selectCell, enterNumber,
    wrongCells, isComplete, noteMode, toggleNoteMode, restart,
  } = useSudokuGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="ナンプレ" onRestart={restart} />

      <View style={styles.boardContainer}>
        <SudokuBoard
          state={state}
          selectedCell={selectedCell}
          wrongCells={wrongCells}
          onSelectCell={selectCell}
        />
      </View>

      <View style={styles.numPad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <TouchableOpacity
            key={num}
            style={styles.numButton}
            onPress={() => enterNumber(num)}
            activeOpacity={0.7}
          >
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.numButton, styles.clearButton]}
          onPress={() => enterNumber(null)}
          activeOpacity={0.7}
        >
          <Text style={styles.numText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.memoButton, noteMode && styles.memoButtonActive]}
          onPress={toggleNoteMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.memoText, noteMode && styles.memoTextActive]}>
            ✏ メモ {noteMode ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <AppDialog
        visible={isComplete}
        title="🎉 クリア！"
        message="おめでとうございます！"
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
  },
  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: vault.surface,
    borderTopWidth: 1,
    borderTopColor: vault.border,
  },
  numButton: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: vault.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: vault.borderLight,
  },
  clearButton: {
    backgroundColor: '#3A2425',
    borderColor: semantic.danger,
  },
  numText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: ink.strong,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: vault.surface,
    borderTopWidth: 1,
    borderTopColor: vault.border,
  },
  memoButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: vault.card,
    borderWidth: 1,
    borderColor: vault.borderLight,
  },
  memoButtonActive: {
    backgroundColor: gold.accent,
    borderColor: gold.accent,
  },
  memoText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: ink.body,
  },
  memoTextActive: {
    color: ink.onGold,
  },
})
