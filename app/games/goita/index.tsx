import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { GoitaBoard, PieceTile } from '../../../src/components/games/goita/Board'
import { useGoitaGame } from '../../../src/hooks/useGoitaGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function GoitaScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, selected, select, playPiece, restart, lastPlay, isHumanTurn, isWin, isLose } =
    useGoitaGame(difficulty)

  const myHand = state.hands[0]
  const gameOver = state.finished

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ごいた</Text>
        <TouchableOpacity onPress={restart} style={styles.restartButton}>
          <Text style={styles.restartText}>↺</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {gameOver
            ? 'ゲーム終了'
            : isHumanTurn
              ? 'あなたの番です。駒を選んで「出す」を押してください'
              : '相手の番です…'}
        </Text>
      </View>

      <View style={styles.boardContainer}>
        <GoitaBoard state={state} lastPlay={lastPlay} />
      </View>

      <View style={styles.handArea}>
        <Text style={styles.handLabel}>あなたの手札</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
          {myHand.map((piece, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => select(index)}
              disabled={!isHumanTurn}
              activeOpacity={0.7}
            >
              <PieceTile piece={piece} highlighted={selected === index} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.playButton, (!isHumanTurn || selected === null) && styles.playButtonDisabled]}
          onPress={() => selected !== null && playPiece(selected)}
          disabled={!isHumanTurn || selected === null}
        >
          <Text style={styles.playButtonText}>出す</Text>
        </TouchableOpacity>
      </View>

      {/* 勝敗ダイアログ */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>{isWin ? '🎉 勝利！' : isLose ? '😢 敗北' : 'ゲーム終了'}</Text>
            <Text style={styles.dialogMessage}>
              {isWin ? 'あなたのチームの勝ちです！' : isLose ? '相手チームの勝ちです' : ''}
            </Text>
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
  handArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  handLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  handRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  playButton: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4285f4',
  },
  playButtonDisabled: {
    backgroundColor: '#ccc',
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
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
