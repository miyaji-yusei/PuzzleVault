import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SpiderBoard } from '../../../src/components/games/spider/Board'
import { useSpiderGame } from '../../../src/hooks/useSpiderGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

const SUIT_LABEL: Record<string, string> = {
  easy: '1スート',
  normal: '2スート',
  hard: '4スート',
  expert: '4スート',
}

export default function SpiderScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const {
    puzzle, state, selected, isComplete, isGameOver,
    lives, canUndo,
    tapTableau, deal, undo, restart,
  } = useSpiderGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Spider</Text>
        <View style={styles.headerRight}>
          {lives === null ? (
            <Text style={styles.livesInfinite}>∞</Text>
          ) : (
            <View style={styles.heartsRow}>
              {Array.from({ length: difficulty === 'normal' ? 5 : 3 }, (_, i) => (
                <Text key={i} style={[styles.heart, i < lives ? styles.heartOn : styles.heartOff]}>♥</Text>
              ))}
            </View>
          )}
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={undo}
              disabled={!canUndo}
              style={[styles.iconBtn, !canUndo && styles.iconBtnDisabled]}
            >
              <Text style={styles.iconBtnText}>↩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={restart} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>↺</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {SUIT_LABEL[difficulty]} ・ 手数: {state.moves} ・ 同スートのK→Aを完成させよう
        </Text>
      </View>

      <SpiderBoard
        state={state}
        selected={selected}
        onTapTableau={tapTableau}
        onDeal={deal}
      />

      {/* Win dialog */}
      <Modal visible={isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>🎉 クリア！</Text>
            <Text style={styles.dialogMessage}>全8セット完成！手数: {state.moves}</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogBtn, styles.dialogBtnCancel]} onPress={() => router.back()}>
                <Text style={styles.dialogBtnTextCancel}>タイトルに戻る</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtn, styles.dialogBtnOk]} onPress={restart}>
                <Text style={styles.dialogBtnTextOk}>もう一度</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Game over dialog */}
      <Modal visible={isGameOver && !isComplete} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>💔 ゲームオーバー</Text>
            <Text style={styles.dialogMessage}>ライフがなくなりました</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={[styles.dialogBtn, styles.dialogBtnCancel]} onPress={() => router.back()}>
                <Text style={styles.dialogBtnTextCancel}>タイトルに戻る</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogBtn, styles.dialogBtnOk]} onPress={restart}>
                <Text style={styles.dialogBtnTextOk}>もう一度</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deal unavailable hint - shown as subtitle when can't deal */}
      {puzzle.suitCount !== undefined && state.stock.length > 0 &&
        state.tableau.some(col => col.length === 0) && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>空列があると配れません</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1b5e20',
    borderBottomWidth: 1,
    borderBottomColor: '#2e7d32',
  },
  backButton: { padding: 4 },
  backText: { fontSize: 14, color: '#a5d6a7' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  livesInfinite: { fontSize: 20, color: '#a5d6a7', fontWeight: 'bold' },
  heartsRow: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 14 },
  heartOn: { color: '#ef5350' },
  heartOff: { color: '#555' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  iconBtnDisabled: { opacity: 0.4 },
  iconBtnText: { color: '#fff', fontSize: 16 },
  infoRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2e7d32',
  },
  infoText: { fontSize: 11, color: '#c8e6c9', textAlign: 'center' },
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
  dialogTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginBottom: 8 },
  dialogMessage: { fontSize: 14, color: '#555', textAlign: 'center' },
  dialogButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  dialogBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 90, alignItems: 'center' },
  dialogBtnCancel: { backgroundColor: '#eee' },
  dialogBtnOk: { backgroundColor: '#1b5e20' },
  dialogBtnTextCancel: { color: '#333', fontWeight: '600' },
  dialogBtnTextOk: { color: '#fff', fontWeight: '600' },
  hintBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  hintText: { color: '#fff', fontSize: 12 },
})
