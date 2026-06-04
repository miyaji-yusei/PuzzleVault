import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { NonogramBoard } from '../../../src/components/games/nonogram/Board'
import { useNonogramGame } from '../../../src/hooks/useNonogramGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function NonogramScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, setCell, mode, setMode, isComplete, restart } = useNonogramGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>イラストロジック</Text>
        <TouchableOpacity onPress={restart} style={styles.restartButton}>
          <Text style={styles.restartText}>↺</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.boardContainer}>
        <NonogramBoard state={state} onSetCell={setCell} />
      </ScrollView>

      {/* Mode toggle */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'fill' && styles.modeButtonActive]}
          onPress={() => setMode('fill')}
        >
          <View style={styles.fillPreview} />
          <Text style={[styles.modeButtonText, mode === 'fill' && styles.modeButtonTextActive]}>
            塗る
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'cross' && styles.modeButtonActive]}
          onPress={() => setMode('cross')}
        >
          <Text style={[styles.crossPreview, mode === 'cross' && styles.crossPreviewActive]}>×</Text>
          <Text style={[styles.modeButtonText, mode === 'cross' && styles.modeButtonTextActive]}>
            ×印
          </Text>
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
    flexGrow: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 24,
    gap: 16,
    justifyContent: 'center',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
    minWidth: 110,
    justifyContent: 'center',
  },
  modeButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#e8f1fb',
  },
  modeButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#4A90E2',
  },
  fillPreview: {
    width: 16,
    height: 16,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  crossPreview: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  crossPreviewActive: {
    color: '#4A90E2',
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
    marginBottom: 4,
    textAlign: 'center',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dialogButton: {
    paddingHorizontal: 20,
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
