import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SevenBoard } from '../../../src/components/games/seven/Board'
import { useSevenGame } from '../../../src/hooks/useSevenGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

const RANK_LABELS = ['1位', '2位', '3位', '4位']

export default function SevenScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const {
    state,
    puzzle,
    selectedCard,
    isComplete,
    isGameOver,
    humanRank,
    humanPassesLeft,
    playableCards,
    isHumanTurn,
    selectCard,
    playCard,
    pass,
    restart,
  } = useSevenGame(difficulty)

  const canPlay = selectedCard !== null && isHumanTurn
  const canPass = isHumanTurn && playableCards.length === 0

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Seven</Text>
        <View style={styles.headerRight}>
          <Text style={styles.passInfo}>パス残: {humanPassesLeft}</Text>
          <TouchableOpacity onPress={restart} style={styles.restartButton}>
            <Text style={styles.restartText}>↺</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          7を起点に各スートのカードを昇降順に出していこう
        </Text>
      </View>

      <SevenBoard
        state={state}
        selectedCard={selectedCard}
        playableCards={playableCards}
        isHumanTurn={isHumanTurn}
        onSelectCard={selectCard}
      />

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, styles.playBtn, !canPlay && styles.disabledBtn]}
          onPress={playCard}
          disabled={!canPlay}
        >
          <Text style={[styles.controlBtnText, !canPlay && styles.disabledBtnText]}>
            出す
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, styles.passBtn, (!isHumanTurn || humanPassesLeft <= 0) && styles.disabledBtn]}
          onPress={pass}
          disabled={!isHumanTurn || humanPassesLeft <= 0}
        >
          <Text style={[styles.controlBtnText, (!isHumanTurn || humanPassesLeft <= 0) && styles.disabledBtnText]}>
            パス（残{humanPassesLeft}）
          </Text>
        </TouchableOpacity>
      </View>

      {/* Result dialog */}
      <Modal visible={isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {humanRank === 1 ? '🎉 1位！' : `${RANK_LABELS[(humanRank ?? 2) - 1]} 上がり！`}
            </Text>
            <Text style={styles.dialogMessage}>
              {humanRank === 1 ? 'おめでとうございます！最初に全カードを出し切りました！' : `全カードを出し切りました！`}
            </Text>
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
            <Text style={styles.dialogTitle}>💔 パス上限超過</Text>
            <Text style={styles.dialogMessage}>パス回数の上限（{puzzle.passLimit}回）を超えました</Text>
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
    gap: 10,
  },
  passInfo: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
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
    paddingVertical: 6,
    backgroundColor: '#fffde7',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoText: {
    fontSize: 12,
    color: '#795548',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  playBtn: {
    backgroundColor: '#1976d2',
  },
  passBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  disabledBtn: {
    backgroundColor: '#f0f0f0',
    borderColor: '#e0e0e0',
  },
  controlBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  disabledBtnText: {
    color: '#bbb',
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
    width: 300,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
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
