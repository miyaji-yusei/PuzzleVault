import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LibraBoard } from '../../../src/components/games/libra/Board'
import { useLibraGame } from '../../../src/hooks/useLibraGame'
import { Difficulty } from '../../../src/types/engine'

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

function isDifficulty(v: unknown): v is Difficulty {
  return VALID_DIFFICULTIES.includes(v as Difficulty)
}

export default function LibraScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ difficulty?: string }>()
  const difficulty: Difficulty = isDifficulty(params.difficulty) ? params.difficulty : 'normal'

  const { state, pressCell, lives, isComplete, isGameOver } = useLibraGame(difficulty)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Libra</Text>
        <View style={styles.lives}>
          {Array.from({ length: 3 }, (_, i) => (
            <Text key={i} style={[styles.heart, i < lives ? styles.heartActive : styles.heartLost]}>
              ♥
            </Text>
          ))}
        </View>
      </View>

      {isComplete && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🎉 クリア！</Text>
        </View>
      )}
      {isGameOver && (
        <View style={[styles.banner, styles.bannerGameOver]}>
          <Text style={styles.bannerText}>ゲームオーバー</Text>
        </View>
      )}

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          全マスにAかBを入力。行・列3連続禁止、均等配置。
          <Text style={styles.eqText}> = 同じ</Text>
          <Text style={styles.neqText}> × 異なる</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.boardContainer}>
        <LibraBoard state={state} onPressCell={pressCell} />
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>タップ: A → B → 消去</Text>
      </View>
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
  lives: {
    flexDirection: 'row',
    gap: 4,
  },
  heart: {
    fontSize: 20,
  },
  heartActive: {
    color: '#e53935',
  },
  heartLost: {
    color: '#ccc',
  },
  banner: {
    backgroundColor: '#4caf50',
    padding: 12,
    alignItems: 'center',
  },
  bannerGameOver: {
    backgroundColor: '#e53935',
  },
  bannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fffde7',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#795548',
    textAlign: 'center',
  },
  eqText: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  neqText: {
    color: '#c62828',
    fontWeight: 'bold',
  },
  boardContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  legend: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#888',
  },
})
