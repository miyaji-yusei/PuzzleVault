import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
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

  const { state, selectedCell, selectCell, enterNumber, wrongCells, isComplete } =
    useSudokuGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ナンプレ</Text>
        <View style={{ width: 60 }} />
      </View>

      {isComplete && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🎉 クリア！</Text>
        </View>
      )}

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
  banner: {
    backgroundColor: '#4caf50',
    padding: 12,
    alignItems: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
})
