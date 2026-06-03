import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SolitaireBoard } from '../../../src/components/games/solitaire/Board'
import { useSolitaireGame } from '../../../src/hooks/useSolitaireGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function SolitaireScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, puzzle, selected, isComplete, maxResets, tapStock, tapWaste, tapTableau, tapFoundation } =
    useSolitaireGame(difficulty)

  const resetLeft = maxResets === 999 ? '∞' : String(maxResets - state.stockResets)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ソリティア</Text>
        <View style={styles.headerRight}>
          <Text style={styles.metaText}>スコア: {state.score}</Text>
          <Text style={styles.metaText}>手数: {state.moves}</Text>
          <Text style={styles.metaText}>リセット残: {resetLeft}</Text>
        </View>
      </View>

      {isComplete && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🎉 クリア！ スコア: {state.score}</Text>
        </View>
      )}

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {puzzle.drawMode === 1 ? '1枚めくり' : '3枚めくり'} ・ {difficulty} ・ タップで移動（Aタップ→自動組み札）
        </Text>
      </View>

      <SolitaireBoard
        state={state}
        selected={selected}
        onTapStock={tapStock}
        onTapWaste={tapWaste}
        onTapFoundation={tapFoundation}
        onTapTableau={tapTableau}
      />
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
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    color: '#c8e6c9',
  },
  banner: {
    backgroundColor: '#f9a825',
    padding: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
})
