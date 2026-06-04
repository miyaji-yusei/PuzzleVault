import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { QueensBoard } from '../../../src/components/games/queens/Board'
import { useQueensGame } from '../../../src/hooks/useQueensGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function QueensScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, placeCross, placeQueen, dragCross, dragRemoveCross, lives, isComplete, isGameOver, restart, flashWrongCell, lastCorrectCell } =
    useQueensGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>クイーンズマスター</Text>
        <View style={styles.headerRight}>
          <View style={styles.lives}>
            {Array.from({ length: 3 }, (_, i) => (
              <Text key={i} style={[styles.heart, i < lives ? styles.heartActive : styles.heartLost]}>
                ♥
              </Text>
            ))}
          </View>
          <TouchableOpacity onPress={restart} style={styles.restartButton}>
            <Text style={styles.restartText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>各色領域に1つずつクイーンを配置（同行・同列・隣接不可）</Text>
      </View>

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

      <View style={styles.legend}>
        <Text style={styles.legendText}>タップ: ×印 ／ ダブルタップ: ♛配置 ／ ドラッグ: 複数×</Text>
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

      {/* Game over dialog */}
      <Modal visible={isGameOver} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>💔 ゲームオーバー</Text>
            <Text style={styles.dialogMessage}>ライフがなくなりました</Text>
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
  },
  backText: {
    fontSize: 16,
    color: '#4A90E2',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lives: {
    flexDirection: 'row',
    gap: 4,
  },
  heart: {
    fontSize: 20,
  },
  heartActive: {
    color: '#e53935',
  },
  heartLost: {
    color: '#ccc',
  },
  restartButton: {
    padding: 4,
  },
  restartText: {
    fontSize: 22,
    color: '#4A90E2',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fffde7',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoText: {
    fontSize: 12,
    color: '#795548',
    textAlign: 'center',
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  legend: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#888',
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
