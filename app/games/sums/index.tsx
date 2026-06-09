import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SumsBoard } from '../../../src/components/games/sums/Board'
import { useSumsGame } from '../../../src/hooks/useSumsGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sums</Text>
        <View style={styles.headerRight}>
          {lives === null ? (
            <Text style={styles.livesInfinite}>∞</Text>
          ) : (
            <Text style={styles.livesText}>{'❤️'.repeat(Math.max(0, lives))}</Text>
          )}
        </View>
      </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>タップで ×→○→空 を切り替え</Text>
      </View>

      <ScrollView contentContainerStyle={styles.boardContainer}>
        {isLoading || !state ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a237e" />
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

      {/* クリアダイアログ */}
      <Modal visible={isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>🎉 クリア！</Text>
            <Text style={styles.dialogMessage}>おめでとうございます！</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonOk]} onPress={restart}>
                <Text style={styles.dialogButtonText}>もう一度プレイ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonCancel]} onPress={() => router.back()}>
                <Text style={styles.dialogButtonTextCancel}>タイトルに戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ゲームオーバーダイアログ */}
      <Modal visible={isGameOver && !isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>💔 ゲームオーバー</Text>
            <Text style={styles.dialogMessage}>ライフがなくなりました</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonOk]} onPress={restart}>
                <Text style={styles.dialogButtonText}>もう一度プレイ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonCancel]} onPress={() => router.back()}>
                <Text style={styles.dialogButtonTextCancel}>タイトルに戻る</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a237e',
  },
  backButton: { padding: 4, minWidth: 60 },
  backText: { fontSize: 16, color: '#90caf9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerRight: { minWidth: 60, alignItems: 'flex-end' },
  livesInfinite: { fontSize: 20, color: '#a5d6a7', fontWeight: 'bold' },
  livesText: { fontSize: 16, color: '#fff' },
  hint: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#e8eaf6',
  },
  hintText: { fontSize: 12, color: '#5c6bc0' },
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
    fontSize: 14,
    color: '#666',
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
  dialogTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  dialogMessage: { fontSize: 15, color: '#555', textAlign: 'center' },
  dialogButtons: { marginTop: 20, gap: 10, width: '100%' },
  dialogButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dialogButtonOk: { backgroundColor: '#1a237e' },
  dialogButtonCancel: { backgroundColor: '#f0f0f0' },
  dialogButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  dialogButtonTextCancel: { color: '#555', fontWeight: '600', fontSize: 15 },
})
