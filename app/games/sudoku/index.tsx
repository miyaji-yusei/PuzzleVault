import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SudokuBoard } from '../../../src/components/games/sudoku/Board'
import { useSudokuGame } from '../../../src/hooks/useSudokuGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function SudokuScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, selectedCell, selectCell, enterNumber, wrongCells, isComplete, restart } =
    useSudokuGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ナンプレ</Text>
        <TouchableOpacity onPress={restart} style={styles.restartButton}>
          <Text style={styles.restartText}>↺</Text>
        </TouchableOpacity>
      </View>

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

      {/* Win dialog */}
      <Modal visible={isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>🎉 クリア！</Text>
            <Text style={styles.dialogMessage}>おめでとうございます！</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={restart}
              >
                <Text style={styles.dialogButtonText}>もう一度プレイ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => router.back()}
              >
                <Text style={styles.dialogButtonTextCancel}>戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    minWidth: 60,
  },
  backText: {
    fontSize: 16,
    color: '#4A90E2',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  restartButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  restartText: {
    fontSize: 22,
    color: '#4A90E2',
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  numButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e8f1fb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b8d4f8',
  },
  clearButton: {
    backgroundColor: '#fce4e4',
    borderColor: '#f8b8b8',
  },
  numText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
  },
  dialogButtons: {
    marginTop: 20,
    gap: 10,
    width: '100%',
  },
  dialogButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogButtonOk: {
    backgroundColor: '#4285f4',
  },
  dialogButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  dialogButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  dialogButtonTextCancel: {
    color: '#555',
    fontWeight: '600',
    fontSize: 15,
  },
})
