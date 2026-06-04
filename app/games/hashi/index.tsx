import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { HashiBoard } from '../../../src/components/games/hashi/Board'
import { useHashiGame } from '../../../src/hooks/useHashiGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function HashiScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, lives, isComplete, isGameOver, toggleBridge, restart } = useHashiGame(difficulty)

  const maxLives = lives !== null ? (difficulty === 'normal' ? 5 : 3) : null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hashi</Text>
        <View style={styles.headerRight}>
          {lives === null ? (
            <Text style={styles.infiniteLives}>∞</Text>
          ) : (
            <View style={styles.lives}>
              {Array.from({ length: maxLives ?? 3 }, (_, i) => (
                <Text key={i} style={[styles.heart, i < lives ? styles.heartActive : styles.heartLost]}>
                  ♥
                </Text>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={restart} style={styles.restartButton}>
            <Text style={styles.restartText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          島の数字の分だけ橋を引いて全島をつなごう。タップで橋0→1→2→削除
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.boardContainer}>
        <HashiBoard state={state} onToggleBridge={toggleBridge} />
      </ScrollView>

      {/* Win dialog */}
      <Modal visible={isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>🎉 クリア！</Text>
            <Text style={styles.dialogMessage}>全島をつなぎました！</Text>
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
                <Text style={styles.dialogButtonTextCancel}>タイトルに戻る</Text>
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
    fontSize: 18,
  },
  heartActive: {
    color: '#e53935',
  },
  heartLost: {
    color: '#ccc',
  },
  infiniteLives: {
    fontSize: 22,
    color: '#4caf50',
    fontWeight: 'bold',
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
