import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, Switch } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { SpiderBoard } from '../../../src/components/games/spider/Board'
import { useSpiderGame } from '../../../src/hooks/useSpiderGame'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { Difficulty } from '../../../src/types/engine'

type ModalOrientation = 'portrait' | 'portrait-upside-down' | 'landscape' | 'landscape-left' | 'landscape-right'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

type DifficultyOption = {
  id: Difficulty
  label: string
  suitLabel: string
  description: string
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: 'easy',   label: 'Easy',   suitLabel: '1スート', description: 'スペードのみ・最も簡単' },
  { id: 'normal', label: 'Normal', suitLabel: '2スート', description: 'スペード・ハート' },
  { id: 'hard',   label: 'Hard',   suitLabel: '4スート', description: '全スート・最も難しい' },
]

function DifficultySelect() {
  const router = useRouter()

  return (
    <SafeAreaView style={dsStyles.container}>
      <View style={dsStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={dsStyles.backButton}>
          <Text style={dsStyles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={dsStyles.title}>Spider Solitaire</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <View style={dsStyles.content}>
        <Text style={dsStyles.subtitle}>難易度を選んでください</Text>

        {DIFFICULTY_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.id}
            style={dsStyles.card}
            onPress={() => router.push(`/games/spider?difficulty=${opt.id}`)}
            activeOpacity={0.8}
          >
            <View style={dsStyles.cardLeft}>
              <Text style={dsStyles.cardLabel}>{opt.label}</Text>
              <Text style={dsStyles.cardSuit}>{opt.suitLabel}</Text>
            </View>
            <Text style={dsStyles.cardDesc}>{opt.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  )
}

function SpiderGame({ difficulty }: { difficulty: Difficulty }) {
  const router = useRouter()
  const dealWithEmpty = useSettingsStore(s => s.solitaireAllowDealWithEmptyColumn)
  const setDealWithEmpty = useSettingsStore(s => s.setSolitaireAllowDealWithEmptyColumn)
  const landscapeEnabled = useSettingsStore(s => s.spiderLandscapeEnabled)
  const setLandscapeEnabled = useSettingsStore(s => s.setSpiderLandscapeEnabled)

  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  const {
    puzzle, state, selected, isComplete,
    canUndo,
    tapTableau, doubleTapCard, directMove, deal, undo, restart,
    completingSet, onSetAnimationDone,
  } = useSpiderGame(difficulty, undefined, { dealWithEmpty })

  // 横画面表示が許可されている間だけ画面回転を許可し、画面を離れるときは縦画面に戻す
  useEffect(() => {
    if (landscapeEnabled) {
      ScreenOrientation.unlockAsync()
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
  }, [landscapeEnabled])

  // iOSではModalはデフォルトでportraitに固定されるため、横画面表示時はモーダルにも
  // landscapeを許可してダイアログ表示中に縦画面へ戻されないようにする
  const modalSupportedOrientations: ModalOrientation[] = landscapeEnabled
    ? ['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']
    : ['portrait']

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Spider</Text>
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
          <TouchableOpacity onPress={() => setShowSettingsDialog(true)} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {difficulty === 'easy' ? '1スート' : difficulty === 'normal' ? '2スート' : '4スート'} ・ 手数: {state.moves} ・ 同スートのK→Aを完成させよう
        </Text>
      </View>

      <View style={styles.settingsRow}>
        <Text style={styles.settingsLabel}>空列があっても山札を配る</Text>
        <Switch
          value={dealWithEmpty}
          onValueChange={setDealWithEmpty}
          trackColor={{ false: '#555', true: '#66bb6a' }}
          thumbColor={dealWithEmpty ? '#fff' : '#ccc'}
        />
      </View>

      <SpiderBoard
        state={state}
        selected={selected}
        onTapTableau={tapTableau}
        onDoubleTapCard={doubleTapCard}
        onDirectMove={directMove}
        onDeal={deal}
        completingSet={completingSet}
        onSetAnimationDone={onSetAnimationDone}
      />

      {/* Win dialog */}
      <Modal visible={isComplete} transparent animationType="fade" supportedOrientations={modalSupportedOrientations}>
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

      {/* Settings dialog */}
      <Modal visible={showSettingsDialog} transparent animationType="fade" supportedOrientations={modalSupportedOrientations}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>設定</Text>
            <View style={styles.dialogSettingsRow}>
              <Text style={styles.dialogSettingsLabel}>横画面表示を許可</Text>
              <Switch
                value={landscapeEnabled}
                onValueChange={setLandscapeEnabled}
                trackColor={{ false: '#555', true: '#66bb6a' }}
                thumbColor={landscapeEnabled ? '#fff' : '#ccc'}
              />
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogBtnOk]}
                onPress={() => setShowSettingsDialog(false)}
              >
                <Text style={styles.dialogBtnTextOk}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deal unavailable hint (strict mode only) */}
      {!dealWithEmpty && state.stock.length > 0 &&
        state.tableau.some(col => col.length === 0) && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>山札を配るには、すべての列にカードが必要です</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

export default function SpiderScreen() {
  const params = useLocalSearchParams<{ difficulty?: string }>()
  if (!isDifficulty(params.difficulty)) {
    return <DifficultySelect />
  }
  return <SpiderGame difficulty={params.difficulty} />
}

// --- DifficultySelect styles ---
const dsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b5e20' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1b5e20',
    borderBottomWidth: 1,
    borderBottomColor: '#2e7d32',
  },
  backButton: { padding: 4, minWidth: 60 },
  backText: { fontSize: 14, color: '#a5d6a7' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  subtitle: { fontSize: 16, color: '#c8e6c9', textAlign: 'center', marginBottom: 24 },
  card: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardLeft: { minWidth: 80 },
  cardLabel: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  cardSuit: { fontSize: 13, color: '#a5d6a7', marginTop: 2 },
  cardDesc: { fontSize: 14, color: '#c8e6c9', flex: 1 },
})

// --- SpiderGame styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1b5e20' },
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
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  iconBtnDisabled: { opacity: 0.4 },
  iconBtnText: { color: '#fff', fontSize: 16 },
  infoRow: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#2e7d32' },
  infoText: { fontSize: 11, color: '#c8e6c9', textAlign: 'center' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#1b5e20',
    borderBottomWidth: 1,
    borderBottomColor: '#2e7d32',
  },
  settingsLabel: { fontSize: 11, color: '#c8e6c9' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 280, alignItems: 'center',
  },
  dialogTitle: { fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginBottom: 8 },
  dialogMessage: { fontSize: 14, color: '#555', textAlign: 'center' },
  dialogSettingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    marginTop: 8,
  },
  dialogSettingsLabel: { fontSize: 14, color: '#333' },
  dialogButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  dialogBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 90, alignItems: 'center' },
  dialogBtnCancel: { backgroundColor: '#eee' },
  dialogBtnOk: { backgroundColor: '#1b5e20' },
  dialogBtnTextCancel: { color: '#333', fontWeight: '600' },
  dialogBtnTextOk: { color: '#fff', fontWeight: '600' },
  hintBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6, alignItems: 'center',
  },
  hintText: { color: '#fff', fontSize: 12 },
})
