import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, SafeAreaView, Animated, Dimensions, Switch, Platform } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SolitaireBoard } from '../../../src/components/games/solitaire/Board'
import { useSolitaireGame } from '../../../src/hooks/useSolitaireGame'
import { Difficulty } from '../../../src/types/engine'
import { useProgressStore } from '../../../src/stores/progressStore'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, Button, DifficultySelect } from '../../../src/components/ui'
import { lockPortrait, unlockOrientation } from '../../../src/utils/orientation'
import { vault, gold, ink, felt, fontSize, radii } from '../../../src/theme'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const SUITS = ['♠', '♥', '♦', '♣']
const CARD_COLORS = ['#1A1A1A', '#C9483B', '#C9483B', '#1A1A1A']

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
      unlockOrientation()
    } else {
      lockPortrait()
    }
    return () => {
      lockPortrait()
    }
  }, [landscapeEnabled])

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
    return <SolitaireDifficultySelect onSelect={setSelectedDifficulty} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader
        title="ソリティア"
        score={state.score}
        onUndo={canUndo ? undo : undefined}
        onRestart={() => setShowRestartDialog(true)}
        onSettings={() => setShowSettingsDialog(true)}
      />

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

      <AppDialog
        visible={showRestartDialog}
        title="リセット確認"
        message="ゲームをリセットしますか？"
        actions={[
          { label: 'はい', onPress: () => { setShowRestartDialog(false); restart() } },
          { label: 'いいえ', onPress: () => setShowRestartDialog(false), variant: 'secondary' },
        ]}
      />

      <AppDialog
        visible={showSettingsDialog}
        title="設定"
        actions={[{ label: '閉じる', onPress: () => setShowSettingsDialog(false) }]}
      >
        {Platform.OS !== 'web' && (
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>横画面表示を許可</Text>
            <Switch
              value={landscapeEnabled}
              onValueChange={setLandscapeEnabled}
              trackColor={{ false: vault.borderLight, true: gold.deep }}
              thumbColor={landscapeEnabled ? gold.accent : '#ccc'}
            />
          </View>
        )}
      </AppDialog>

      <AppDialog
        visible={showAutoCompleteDialog}
        title="自動完成"
        message="すべてのカードを組み札に移動しますか？"
        actions={[
          { label: 'OK', onPress: () => { setShowAutoCompleteDialog(false); autoComplete() } },
          { label: 'キャンセル', onPress: () => setShowAutoCompleteDialog(false), variant: 'secondary' },
        ]}
      />

      <AppDialog
        visible={showDeadlockDialog}
        title="詰みました"
        message="これ以上有効な手がありません。"
        actions={[
          { label: '新しいゲーム', onPress: () => { setShowDeadlockDialog(false); newGame() } },
          { label: 'リセット', onPress: () => { setShowDeadlockDialog(false); restart() }, variant: 'secondary' },
          ...(canUndo
            ? [{ label: '手を戻す', onPress: () => { setShowDeadlockDialog(false); undo() }, variant: 'secondary' as const }]
            : []),
        ]}
      />

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

      <AppDialog
        visible={showWinDialog}
        title="🎉 クリア！"
        message={`スコア: ${state.score}点 ・ 手数: ${state.moves}手`}
        actions={[
          { label: 'もう一度プレイ', onPress: () => { setShowWinDialog(false); restart() } },
          { label: 'タイトルに戻る', onPress: () => router.back(), variant: 'secondary' },
        ]}
      >
        <View style={styles.statsBox}>
          <Text style={styles.statsTitle}>通算成績</Text>
          <Text style={styles.statsText}>プレイ: {solitaireStats.totalPlayed}回</Text>
          <Text style={styles.statsText}>クリア: {solitaireStats.totalCleared}回</Text>
          <Text style={styles.statsText}>勝率: {winRate}%</Text>
        </View>
      </AppDialog>
    </SafeAreaView>
  )
}

const SOLITAIRE_DIFFICULTIES: Difficulty[] = ['easy', 'hard']
const SOLITAIRE_DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '山札を1枚ずつめくる',
  normal: '',
  hard: '山札を3枚ずつめくる',
  expert: '',
}

function SolitaireDifficultySelect({ onSelect }: { onSelect: (d: Difficulty) => void }) {
  const [selected, setSelected] = useState<Difficulty>('easy')

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="ソリティア" />
      <View style={styles.selectScreen}>
        <Text style={styles.selectTitle}>難易度を選択</Text>
        <DifficultySelect options={SOLITAIRE_DIFFICULTIES} selected={selected} onSelect={setSelected} />
        <Text style={styles.selectDesc}>{SOLITAIRE_DIFFICULTY_DESC[selected]}</Text>
        <Button label="はじめる" onPress={() => onSelect(selected)} style={styles.startButton} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: felt.dark,
  },
  infoRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: felt.base,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: ink.body,
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
    fontSize: fontSize.sm,
    color: ink.strong,
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
    borderRadius: radii.sm,
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
    backgroundColor: vault.surface,
    borderRadius: radii.md,
    padding: 12,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: ink.muted,
    marginBottom: 4,
  },
  statsText: {
    fontSize: fontSize.sm,
    color: ink.body,
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
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: ink.strong,
    marginBottom: 16,
  },
  selectDesc: {
    fontSize: fontSize.sm,
    color: ink.body,
  },
  startButton: {
    marginTop: 16,
    paddingHorizontal: 48,
  },
})
