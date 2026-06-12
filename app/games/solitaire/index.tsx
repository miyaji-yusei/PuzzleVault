import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, Animated, Dimensions, Switch } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { SolitaireBoard } from '../../../src/components/games/solitaire/Board'
import { useSolitaireGame } from '../../../src/hooks/useSolitaireGame'
import { Difficulty } from '../../../src/types/engine'
import { useProgressStore } from '../../../src/stores/progressStore'
import { useSettingsStore } from '../../../src/stores/settingsStore'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const SUITS = ['♠', '♥', '♦', '♣']
const CARD_COLORS = ['#1b5e20', '#b71c1c', '#b71c1c', '#1b5e20']

const SCATTER_COUNT = 8

function makeScatterCards() {
  return Array.from({ length: SCATTER_COUNT }, (_, i) => ({
    suit: SUITS[i % 4] as string,
    color: CARD_COLORS[i % 4] as string,
    tx: (Math.random() - 0.5) * SCREEN_W * 1.6,
    ty: (Math.random() - 0.5) * SCREEN_H * 1.6,
    rotate: (Math.random() - 0.5) * 720,
  }))
}

type ModalOrientation = 'portrait' | 'portrait-upside-down' | 'landscape' | 'landscape-left' | 'landscape-right'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function SolitaireScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const paramDifficulty: Difficulty | null = isDifficulty(params.difficulty) ? params.difficulty : null
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(paramDifficulty)
  const difficulty: Difficulty = selectedDifficulty ?? 'easy'

  const { solitaireStats, recordSolitairePlay, recordSolitaireClear } = useProgressStore()

  const {
    state, puzzle, selected, isComplete,
    canAutoComplete, canUndo, isDeadlocked, autoCompleteAnim,
    tapStock, tapWaste, tapTableau, tapFoundation, doubleTapCard, doubleTapWaste, directMove,
    undo, restart, newGame, autoComplete,
  } = useSolitaireGame(difficulty)

  // カード散布アニメーション用
  const scatterAnims = useRef(
    Array.from({ length: SCATTER_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current
  const scatterCards = useRef(makeScatterCards()).current
  const [showScatter, setShowScatter] = useState(false)
  const [showWinDialog, setShowWinDialog] = useState(false)
  const prevComplete = useRef(false)

  // ゲーム開始時に統計記録
  useEffect(() => {
    if (selectedDifficulty) recordSolitairePlay()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDifficulty])

  // クリア時にアニメーション再生
  useEffect(() => {
    if (isComplete && !prevComplete.current) {
      prevComplete.current = true
      recordSolitaireClear()
      setShowScatter(true)
      scatterAnims.forEach((anim, i) => {
        anim.x.setValue(0)
        anim.y.setValue(0)
        anim.opacity.setValue(0)
        anim.rotate.setValue(0)
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(anim.x, { toValue: scatterCards[i]!.tx, duration: 1200, useNativeDriver: true }),
          Animated.timing(anim.y, { toValue: scatterCards[i]!.ty, duration: 1200, useNativeDriver: true }),
          Animated.timing(anim.rotate, { toValue: scatterCards[i]!.rotate, duration: 1200, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(900),
            Animated.timing(anim.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]).start()
      })
      setTimeout(() => {
        setShowScatter(false)
        setShowWinDialog(true)
      }, 1500)
    }
    if (!isComplete) {
      prevComplete.current = false
      setShowWinDialog(false)
    }
  }, [isComplete, scatterAnims, scatterCards, recordSolitaireClear])

  const winRate = solitaireStats.totalPlayed > 0
    ? Math.round((solitaireStats.totalCleared / solitaireStats.totalPlayed) * 100)
    : 0

  const [showAutoCompleteDialog, setShowAutoCompleteDialog] = useState(false)
  const [autoCompleteHandled, setAutoCompleteHandled] = useState(false)
  const [showDeadlockDialog, setShowDeadlockDialog] = useState(false)
  const [deadlockHandled, setDeadlockHandled] = useState(false)
  const [showRestartDialog, setShowRestartDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  const landscapeEnabled = useSettingsStore(s => s.solitaireLandscapeEnabled)
  const setLandscapeEnabled = useSettingsStore(s => s.setSolitaireLandscapeEnabled)

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

  useEffect(() => {
    if (canAutoComplete && !autoCompleteHandled) {
      setShowAutoCompleteDialog(true)
      setAutoCompleteHandled(true)
    }
    if (!canAutoComplete) {
      setAutoCompleteHandled(false)
    }
  }, [canAutoComplete, autoCompleteHandled])

  useEffect(() => {
    if (isDeadlocked && !deadlockHandled) {
      setShowDeadlockDialog(true)
      setDeadlockHandled(true)
    }
    if (!isDeadlocked) {
      setDeadlockHandled(false)
    }
  }, [isDeadlocked, deadlockHandled])

  if (!selectedDifficulty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>ソリティア</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.selectScreen}>
          <Text style={styles.selectTitle}>難易度を選択</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectedDifficulty('easy')}
          >
            <Text style={styles.selectButtonTitle}>初級</Text>
            <Text style={styles.selectButtonDesc}>山札を1枚ずつめくる</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectedDifficulty('hard')}
          >
            <Text style={styles.selectButtonTitle}>上級</Text>
            <Text style={styles.selectButtonDesc}>山札を3枚ずつめくる</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ソリティア</Text>
        <View style={styles.headerRight}>
          <Text style={styles.metaText}>スコア: {state.score}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={undo}
              disabled={!canUndo}
              style={[styles.iconButton, !canUndo && styles.iconButtonDisabled]}
            >
              <Text style={styles.iconButtonText}>↩</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRestartDialog(true)} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>↺</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettingsDialog(true)} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {puzzle.drawMode === 1 ? '1枚めくり' : '3枚めくり'} ・ {difficulty} ・ 手数: {state.moves}
        </Text>
      </View>

      <SolitaireBoard
        state={state}
        selected={selected}
        drawMode={puzzle.drawMode}
        onTapStock={tapStock}
        onTapWaste={tapWaste}
        onDoubleTapWaste={doubleTapWaste}
        onTapFoundation={tapFoundation}
        onTapTableau={tapTableau}
        onDoubleTapCard={doubleTapCard}
        onDirectMove={directMove}
        autoCompleteAnim={autoCompleteAnim}
      />

      {/* Restart confirmation dialog */}
      <Modal visible={showRestartDialog} transparent animationType="fade" supportedOrientations={modalSupportedOrientations}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>リセット確認</Text>
            <Text style={styles.dialogMessage}>ゲームをリセットしますか？</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowRestartDialog(false)}
              >
                <Text style={styles.dialogButtonTextCancel}>いいえ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => {
                  setShowRestartDialog(false)
                  restart()
                }}
              >
                <Text style={styles.dialogButtonTextOk}>はい</Text>
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
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>横画面表示を許可</Text>
              <Switch
                value={landscapeEnabled}
                onValueChange={setLandscapeEnabled}
                trackColor={{ false: '#555', true: '#66bb6a' }}
                thumbColor={landscapeEnabled ? '#fff' : '#ccc'}
              />
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => setShowSettingsDialog(false)}
              >
                <Text style={styles.dialogButtonTextOk}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Auto-complete dialog */}
      <Modal visible={showAutoCompleteDialog} transparent animationType="fade" supportedOrientations={modalSupportedOrientations}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>自動完成</Text>
            <Text style={styles.dialogMessage}>すべてのカードを組み札に移動しますか？</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setShowAutoCompleteDialog(false)}
              >
                <Text style={styles.dialogButtonTextCancel}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => {
                  setShowAutoCompleteDialog(false)
                  autoComplete()
                }}
              >
                <Text style={styles.dialogButtonTextOk}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deadlock dialog */}
      <Modal visible={showDeadlockDialog} transparent animationType="fade" supportedOrientations={modalSupportedOrientations}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>詰みました</Text>
            <Text style={styles.dialogMessage}>これ以上有効な手がありません。</Text>
            <View style={styles.dialogButtons}>
              {canUndo && (
                <TouchableOpacity
                  style={[styles.dialogButton, styles.dialogButtonCancel]}
                  onPress={() => {
                    setShowDeadlockDialog(false)
                    undo()
                  }}
                >
                  <Text style={styles.dialogButtonTextCancel}>手を戻す</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowDeadlockDialog(false)
                  restart()
                }}
              >
                <Text style={styles.dialogButtonTextCancel}>リセット</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => {
                  setShowDeadlockDialog(false)
                  newGame()
                }}
              >
                <Text style={styles.dialogButtonTextOk}>新しいゲーム</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* カード散布アニメーション */}
      {showScatter && (
        <View style={styles.scatterOverlay} pointerEvents="none">
          {scatterAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.scatterCard,
                {
                  opacity: anim.opacity,
                  transform: [
                    { translateX: anim.x },
                    { translateY: anim.y },
                    { rotate: anim.rotate.interpolate({ inputRange: [-720, 720], outputRange: ['-720deg', '720deg'] }) },
                  ],
                },
              ]}
            >
              <Text style={[styles.scatterSuit, { color: scatterCards[i]!.color }]}>
                {scatterCards[i]!.suit}
              </Text>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Win dialog */}
      <Modal visible={showWinDialog} transparent animationType="fade" supportedOrientations={modalSupportedOrientations}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>🎉 クリア！</Text>
            <Text style={styles.dialogMessage}>スコア: {state.score}点</Text>
            <Text style={styles.dialogMessage}>手数: {state.moves}手</Text>
            <View style={styles.statsBox}>
              <Text style={styles.statsTitle}>通算成績</Text>
              <Text style={styles.statsText}>プレイ: {solitaireStats.totalPlayed}回</Text>
              <Text style={styles.statsText}>クリア: {solitaireStats.totalCleared}回</Text>
              <Text style={styles.statsText}>勝率: {winRate}%</Text>
            </View>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => router.back()}
              >
                <Text style={styles.dialogButtonTextCancel}>タイトルに戻る</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonOk]}
                onPress={() => { setShowWinDialog(false); restart() }}
              >
                <Text style={styles.dialogButtonTextOk}>もう一度プレイ</Text>
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
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 14,
    color: '#a5d6a7',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#c8e6c9',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  infoRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2e7d32',
  },
  infoText: {
    fontSize: 11,
    color: '#c8e6c9',
    textAlign: 'center',
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
    color: '#1b5e20',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    marginTop: 8,
  },
  settingsLabel: {
    fontSize: 14,
    color: '#333',
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
    minWidth: 100,
    alignItems: 'center',
  },
  dialogButtonCancel: {
    backgroundColor: '#eee',
  },
  dialogButtonOk: {
    backgroundColor: '#1b5e20',
  },
  dialogButtonTextCancel: {
    color: '#333',
    fontWeight: '600',
  },
  dialogButtonTextOk: {
    color: '#fff',
    fontWeight: '600',
  },
  scatterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  scatterCard: {
    position: 'absolute',
    width: 44,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scatterSuit: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statsBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  selectScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  selectButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  selectButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  selectButtonDesc: {
    fontSize: 14,
    color: '#c8e6c9',
  },
})
