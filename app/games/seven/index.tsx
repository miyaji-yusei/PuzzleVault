import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { SevenBoard } from '../../../src/components/games/seven/Board'
import { HowToPlayDialog } from '../../../src/components/games/seven/HowToPlayDialog'
import { SevenTutorialOverlay } from '../../../src/components/games/seven/TutorialOverlay'
import { useSevenGame } from '../../../src/hooks/useSevenGame'
import { handValue } from '../../../src/engines/seven'
import { Difficulty } from '../../../src/types/engine'
import { useProgressStore } from '../../../src/stores/progressStore'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { GameHeader, AppDialog, InfoBanner, Button, DifficultySelect } from '../../../src/components/ui'
import { vault, ink, gold, fontSize, radii } from '../../../src/theme'

const SEVEN_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

export default function SevenScreen() {
  const router = useRouter()
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)

  if (!difficulty) {
    return <DifficultySelectScreen onSelect={setDifficulty} />
  }
  return <SevenGame difficulty={difficulty} onBack={() => router.back()} />
}

function DifficultySelectScreen({ onSelect }: { onSelect: (d: Difficulty) => void }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Difficulty>('normal')

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Seven" onRestart={() => router.back()} />
      <View style={styles.selectScreen}>
        <Text style={styles.selectTitle}>難易度を選択</Text>
        <DifficultySelect options={SEVEN_DIFFICULTIES} selected={selected} onSelect={setSelected} />
        <Button label="はじめる" onPress={() => onSelect(selected)} style={styles.startButton} />
      </View>
    </SafeAreaView>
  )
}

function SevenGame({ difficulty, onBack }: { difficulty: Difficulty; onBack: () => void }) {
  const { state, selectedIndices, isHumanTurn, selectCard, drawFrom, restart } = useSevenGame(difficulty)
  const { sevenStats, recordSevenPlay, recordSevenWin } = useProgressStore()

  const [howToPlayVisible, setHowToPlayVisible] = useState(false)
  const sevenHowToPlayShown = useSettingsStore((s) => s.sevenHowToPlayShown)
  const setSevenHowToPlayShown = useSettingsStore((s) => s.setSevenHowToPlayShown)

  const [tutorialVisible, setTutorialVisible] = useState(false)
  const sevenTutorialShown = useSettingsStore((s) => s.sevenTutorialShown)
  const setSevenTutorialShown = useSettingsStore((s) => s.setSevenTutorialShown)

  useEffect(() => {
    if (!sevenTutorialShown) {
      setTutorialVisible(true)
      setSevenTutorialShown(true)
    } else if (!sevenHowToPlayShown) {
      setHowToPlayVisible(true)
      setSevenHowToPlayShown(true)
    }
  }, [sevenTutorialShown, setSevenTutorialShown, sevenHowToPlayShown, setSevenHowToPlayShown])

  useEffect(() => {
    recordSevenPlay()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gameOver = state.phase === 'finished'
  const isWin = gameOver && state.winner === 0
  const isLose = gameOver && state.winner === 1

  useEffect(() => {
    if (isWin) recordSevenWin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWin])

  const playerTotal = handValue(state.hands[0])
  const aiTotal = handValue(state.hands[1])

  const winRate = sevenStats.totalPlayed > 0 ? Math.round((sevenStats.totalWon / sevenStats.totalPlayed) * 100) : 0

  let infoText = 'AIの番です…'
  if (gameOver) {
    infoText = 'ゲーム終了'
  } else if (isHumanTurn) {
    infoText = selectedIndices.length === 0
      ? '捨てるカードを選びましょう（同じランクをタップ）'
      : '山札か捨て札をタップして1枚引いてください'
  }

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader
        title="Seven"
        onRestart={restart}
        right={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => setTutorialVisible(true)}
              style={styles.helpButton}
              accessibilityLabel="チュートリアルを見る"
            >
              <Text style={styles.helpButtonText}>🎓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHowToPlayVisible(true)}
              style={styles.helpButton}
              accessibilityLabel="遊び方を見る"
            >
              <Text style={styles.helpButtonText}>？</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <InfoBanner text={infoText} />

      <SevenBoard
        state={state}
        selectedIndices={selectedIndices}
        isHumanTurn={isHumanTurn}
        onSelectCard={selectCard}
        onDrawFrom={drawFrom}
      />

      <AppDialog
        visible={gameOver}
        title={isWin ? '🎉 勝利！' : isLose ? '😢 敗北' : 'ゲーム終了'}
        message={`あなた: ${playerTotal}点（${state.hands[0].length}枚） / AI: ${aiTotal}点（${state.hands[1].length}枚）`}
        actions={[
          { label: 'もう一度プレイ', onPress: restart },
          { label: 'タイトルに戻る', onPress: onBack, variant: 'secondary' },
        ]}
      >
        <View style={styles.statsBox}>
          <Text style={styles.statsTitle}>通算成績</Text>
          <Text style={styles.statsText}>プレイ: {sevenStats.totalPlayed}回</Text>
          <Text style={styles.statsText}>勝利: {sevenStats.totalWon}回</Text>
          <Text style={styles.statsText}>勝率: {winRate}%</Text>
        </View>
      </AppDialog>

      <HowToPlayDialog visible={howToPlayVisible} onClose={() => setHowToPlayVisible(false)} />
      <SevenTutorialOverlay visible={tutorialVisible} onClose={() => setTutorialVisible(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vault.bg,
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
  startButton: {
    marginTop: 16,
    paddingHorizontal: 48,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  helpButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: vault.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 18,
    color: gold.accent,
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
})
