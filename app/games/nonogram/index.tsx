import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { NonogramBoard } from '../../../src/components/games/nonogram/Board'
import { useNonogramGame } from '../../../src/hooks/useNonogramGame'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty, VALID_DIFFICULTIES, DIFFICULTY_LABELS } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog, Button, DifficultySelect } from '../../../src/components/ui'
import { vault, gold, ink, fontSize, radii } from '../../../src/theme'

const SIZE_LABEL: Record<Difficulty, string> = {
  easy: '10×10',
  normal: '15×15',
  hard: '20×20',
  expert: '25×25',
}

export default function NonogramScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const paramDifficulty: Difficulty | null = isDifficulty(params.difficulty) ? params.difficulty : null
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(paramDifficulty)
  const difficulty: Difficulty = selectedDifficulty ?? 'easy'

  const { state, setCell, setCellTo, mode, setMode, isComplete, restart, autoCrossed, rowClueColors, colClueColors } = useNonogramGame(difficulty)

  if (!selectedDifficulty) {
    return <NonogramDifficultySelect onSelect={setSelectedDifficulty} />
  }

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title={`イラストロジック (${SIZE_LABEL[difficulty]})`} onRestart={restart} />

      <View style={styles.boardContainer}>
        <NonogramBoard state={state} mode={mode} autoCrossed={autoCrossed} rowClueColors={rowClueColors} colClueColors={colClueColors} onSetCell={setCell} onSetCellTo={setCellTo} />
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'fill' && styles.modeButtonActive]}
          onPress={() => setMode('fill')}
        >
          <View style={[styles.fillPreview, mode === 'fill' && styles.fillPreviewActive]} />
          <Text style={[styles.modeButtonText, mode === 'fill' && styles.modeButtonTextActive]}>
            塗る
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'cross' && styles.modeButtonActive]}
          onPress={() => setMode('cross')}
        >
          <Text style={[styles.crossPreview, mode === 'cross' && styles.modeButtonTextActive]}>×</Text>
          <Text style={[styles.modeButtonText, mode === 'cross' && styles.modeButtonTextActive]}>
            ×印
          </Text>
        </TouchableOpacity>
      </View>

      <AppDialog
        visible={isComplete}
        title="🎉 クリア！"
        message="おめでとうございます！"
        actions={[
          { label: 'もう一度プレイ', onPress: () => setSelectedDifficulty(null) },
          { label: 'タイトルに戻る', onPress: () => router.back(), variant: 'secondary' },
        ]}
      />
    </SafeAreaView>
  )
}

function NonogramDifficultySelect({ onSelect }: { onSelect: (d: Difficulty) => void }) {
  const [selected, setSelected] = useState<Difficulty>('easy')

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="イラストロジック" />
      <View style={styles.selectScreen}>
        <Text style={styles.selectTitle}>難易度を選択</Text>
        <DifficultySelect options={VALID_DIFFICULTIES} selected={selected} onSelect={setSelected} />
        <Text style={styles.selectSizeLabel}>{SIZE_LABEL[selected]} ・ {DIFFICULTY_LABELS[selected]}</Text>
        <Button label="はじめる" onPress={() => onSelect(selected)} style={styles.startButton} />
      </View>
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
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: vault.surface,
    borderTopWidth: 1,
    borderTopColor: vault.border,
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
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: vault.borderLight,
    backgroundColor: vault.card,
    minWidth: 110,
    justifyContent: 'center',
  },
  modeButtonActive: {
    borderColor: gold.accent,
    backgroundColor: vault.surface,
  },
  modeButtonText: {
    fontSize: fontSize.base,
    color: ink.muted,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: gold.accent,
  },
  fillPreview: {
    width: 16,
    height: 16,
    backgroundColor: ink.muted,
    borderRadius: 2,
  },
  fillPreviewActive: {
    backgroundColor: gold.accent,
  },
  crossPreview: {
    fontSize: 18,
    color: ink.muted,
    fontWeight: 'bold',
  },
  selectScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  selectTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: ink.strong,
    marginBottom: 12,
  },
  selectSizeLabel: {
    fontSize: fontSize.base,
    color: ink.body,
  },
  startButton: {
    marginTop: 16,
    paddingHorizontal: 48,
  },
})
