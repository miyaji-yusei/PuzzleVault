import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { GoitaBoard, PieceTile } from '../../../src/components/games/goita/Board'
import { HowToPlayDialog } from '../../../src/components/games/goita/HowToPlayDialog'
import { useGoitaGame } from '../../../src/hooks/useGoitaGame'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { Difficulty } from '../../../src/types/engine'
import { GameHeader, AppDialog, InfoBanner, Button } from '../../../src/components/ui'
import { vault, ink, gold, fontSize } from '../../../src/theme'

const GOITA_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

function isGoitaDifficulty(v: unknown): v is Difficulty {
  return GOITA_DIFFICULTIES.includes(v as Difficulty)
}

export default function GoitaScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isGoitaDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, selected, select, playPiece, restart, lastPlay, isHumanTurn, isWin, isLose } =
    useGoitaGame(difficulty)

  const myHand = state.hands[0]
  const gameOver = state.finished

  const [howToPlayVisible, setHowToPlayVisible] = useState(false)
  const goitaHowToPlayShown = useSettingsStore((s) => s.goitaHowToPlayShown)
  const setGoitaHowToPlayShown = useSettingsStore((s) => s.setGoitaHowToPlayShown)

  useEffect(() => {
    if (!goitaHowToPlayShown) {
      setHowToPlayVisible(true)
      setGoitaHowToPlayShown(true)
    }
  }, [goitaHowToPlayShown, setGoitaHowToPlayShown])

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader
        title="ごいた"
        onRestart={restart}
        right={
          <TouchableOpacity
            onPress={() => setHowToPlayVisible(true)}
            style={styles.helpButton}
            accessibilityLabel="遊び方を見る"
          >
            <Text style={styles.helpButtonText}>？</Text>
          </TouchableOpacity>
        }
      />
      <InfoBanner
        text={
          gameOver
            ? 'ゲーム終了'
            : isHumanTurn
              ? 'あなたの番です。駒を選んで「出す」を押してください'
              : '相手の番です…'
        }
      />

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

        <Button
          label="出す"
          onPress={() => selected !== null && playPiece(selected)}
          disabled={!isHumanTurn || selected === null}
          style={styles.playButton}
        />
      </View>

      <AppDialog
        visible={gameOver}
        title={isWin ? '🎉 勝利！' : isLose ? '😢 敗北' : 'ゲーム終了'}
        message={isWin ? 'あなたのチームの勝ちです！' : isLose ? '相手チームの勝ちです' : ''}
        actions={[
          { label: 'もう一度プレイ', onPress: restart },
          { label: 'タイトルに戻る', onPress: () => router.back(), variant: 'secondary' },
        ]}
      />

      <HowToPlayDialog visible={howToPlayVisible} onClose={() => setHowToPlayVisible(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vault.bg,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  handArea: {
    backgroundColor: vault.surface,
    borderTopWidth: 1,
    borderTopColor: vault.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  handLabel: {
    fontSize: fontSize.xs,
    color: ink.muted,
    marginBottom: 6,
  },
  handRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  playButton: {
    marginTop: 8,
    paddingHorizontal: 40,
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
})
