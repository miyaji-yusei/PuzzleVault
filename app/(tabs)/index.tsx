import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useRef } from 'react'
import { GameIcon, IconName } from '../../src/components/ui'
import { vault, gold, ink, jewels, fontSize, radii, shadows, GameId } from '../../src/theme'

type GameInfo = {
  id: GameId
  name: string
  icon: IconName
  implemented: boolean
}

const GAMES: GameInfo[] = [
  { id: 'solitaire', name: 'ソリティア', icon: 'solitaire', implemented: true },
  { id: 'spider', name: 'スパイダ', icon: 'spider', implemented: true },
  { id: 'sudoku', name: 'ナンプレ', icon: 'sudoku', implemented: true },
  { id: 'nonogram', name: 'イラストロジック', icon: 'nonogram', implemented: true },
  { id: 'queens', name: 'クイーン', icon: 'queens', implemented: true },
  { id: 'libra', name: 'Libra', icon: 'libra', implemented: true },
  { id: 'panda', name: 'Panda', icon: 'panda', implemented: true },
  { id: 'hashi', name: 'Hashi', icon: 'hashi', implemented: true },
  { id: 'sums', name: 'Sums', icon: 'sums', implemented: true },
  { id: 'gechoout', name: 'Gecho Out', icon: 'gechoout', implemented: true },
  { id: 'goita', name: 'ごいた', icon: 'goita', implemented: true },
]

function GameTile({ game, onPress }: { game: GameInfo; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tile, !game.implemented && styles.tileDisabled]}
      onPress={onPress}
      disabled={!game.implemented}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: jewels[game.id] }]}>
        <GameIcon name={game.icon} size={30} color="#FFFFFF" />
      </View>
      <Text style={styles.tileName} numberOfLines={2}>
        {game.name}
      </Text>
      {!game.implemented && <Text style={styles.comingSoon}>準備中</Text>}
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const navigatingRef = useRef(false)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <GameIcon name="bolt" size={22} color={gold.accent} />
        </View>
        <Text style={styles.heroTitle}>PuzzleVault</Text>
        <Text style={styles.heroSubtitle}>クラシックパズル コレクション</Text>
      </View>
      <View style={styles.grid}>
        {GAMES.map((game) => (
          <GameTile
            key={game.id}
            game={game}
            onPress={() => {
              if (navigatingRef.current) return
              navigatingRef.current = true
              router.push(`/games/${game.id}`)
              setTimeout(() => { navigatingRef.current = false }, 1000)
            }}
          />
        ))}
      </View>
    </ScrollView>
  )
}

const TILE_GAP = 10

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vault.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: vault.card,
    borderWidth: 1,
    borderColor: gold.deep,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: gold.accent,
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: fontSize.sm,
    color: ink.muted,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    // 横3列: コンテンツ幅から gap 2つ分を引いた1/3
    width: `${100 / 3}%` as never,
    flexBasis: '31%',
    flexGrow: 1,
    maxWidth: '32%',
    backgroundColor: vault.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: vault.border,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    ...shadows.card,
  },
  tileDisabled: {
    opacity: 0.45,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: ink.strong,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: fontSize.xs,
    color: ink.muted,
    marginTop: 4,
  },
})
