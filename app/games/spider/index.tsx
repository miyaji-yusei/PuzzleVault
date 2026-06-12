import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SpiderBoard } from '../../../src/components/games/spider/Board'
import { useSpiderGame } from '../../../src/hooks/useSpiderGame'
import { useSettingsStore } from '../../../src/stores/settingsStore'
import { Difficulty } from '../../../src/types/engine'
import { isDifficulty } from '../../../src/utils/difficulty'
import { GameHeader, AppDialog } from '../../../src/components/ui'
import { vault, gold, ink, felt, fontSize, radii } from '../../../src/theme'

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
    <SafeAreaView style={styles.container}>
      <GameHeader title="Spider Solitaire" />
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

  const {
    state, isComplete,
    canUndo, selected,
    tapTableau, doubleTapCard, directMove, deal, undo, restart,
    completingSet, onSetAnimationDone,
  } = useSpiderGame(difficulty, undefined, { dealWithEmpty })

  return (
    <SafeAreaView style={styles.container}>
      <GameHeader title="Spider" onUndo={canUndo ? undo : undefined} onRestart={restart} />

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
          trackColor={{ false: vault.borderLight, true: gold.deep }}
          thumbColor={dealWithEmpty ? gold.accent : '#ccc'}
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

      <AppDialog
        visible={isComplete}
        title="🎉 クリア！"
        message={`全8セット完成！手数: ${state.moves}`}
        actions={[
          { label: 'もう一度', onPress: restart },
          { label: 'タイトルに戻る', onPress: () => router.back(), variant: 'secondary' },
        ]}
      />

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

const dsStyles = StyleSheet.create({
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  subtitle: { fontSize: fontSize.base, color: ink.body, textAlign: 'center', marginBottom: 24 },
  card: {
    backgroundColor: vault.card,
    borderWidth: 1,
    borderColor: gold.deep,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardLeft: { minWidth: 80 },
  cardLabel: { fontSize: fontSize.md, fontWeight: 'bold', color: gold.accent },
  cardSuit: { fontSize: fontSize.sm, color: ink.muted, marginTop: 2 },
  cardDesc: { fontSize: fontSize.sm, color: ink.body, flex: 1 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: felt.dark },
  infoRow: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: felt.base },
  infoText: { fontSize: fontSize.xs, color: ink.body, textAlign: 'center' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: felt.dark,
    borderBottomWidth: 1,
    borderBottomColor: felt.base,
  },
  settingsLabel: { fontSize: fontSize.xs, color: ink.body },
  hintBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6, alignItems: 'center',
  },
  hintText: { color: ink.strong, fontSize: fontSize.xs },
})
