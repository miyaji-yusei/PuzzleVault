import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

type GameInfo = {
  id: string
  name: string
  description: string
  implemented: boolean
}

const GAMES: GameInfo[] = [
  {
    id: 'solitaire',
    name: 'ソリティア',
    description: 'クラシックなクロンダイクソリティア',
    implemented: true,
  },
  {
    id: 'sudoku',
    name: 'ナンプレ',
    description: '9×9マスに数字を埋めよう',
    implemented: true,
  },
  {
    id: 'nonogram',
    name: 'イラストロジック',
    description: 'ヒントを頼りにマスを塗りつぶそう',
    implemented: true,
  },
  {
    id: 'queens',
    name: 'クイーンズマスター',
    description: 'すべての色にクイーンを1つずつ置こう',
    implemented: true,
  },
  {
    id: 'libra',
    name: 'Libra',
    description: '天秤のバランスを合わせよう',
    implemented: true,
  },
  {
    id: 'panda',
    name: 'Panda',
    description: 'パンダをペアにしよう',
    implemented: true,
  },
  {
    id: 'hashi',
    name: 'Hashi',
    description: '橋をかけて島をすべてつなごう',
    implemented: true,
  },
  {
    id: 'seven',
    name: 'Seven',
    description: '7並べでトランプを出し切ろう',
    implemented: false,
  },
  {
    id: 'spider',
    name: 'スパイダソリティア',
    description: '2デッキで遊ぶ本格ソリティア',
    implemented: true,
  },
  {
    id: 'sums',
    name: 'Sums',
    description: '数字の合計を埋めるカカロパズル',
    implemented: false,
  },
]

type GameCardProps = {
  game: GameInfo
  onPress: () => void
}

function GameCard({ game, onPress }: GameCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, !game.implemented && styles.cardDisabled]}
      onPress={onPress}
      disabled={!game.implemented}
      activeOpacity={0.7}
    >
      <Text style={styles.cardName}>{game.name}</Text>
      <Text style={styles.cardDescription}>{game.description}</Text>
      {!game.implemented && (
        <Text style={styles.comingSoon}>準備中</Text>
      )}
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>ゲームを選んでください</Text>
      {GAMES.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          onPress={() => router.push(`/games/${game.id}`)}
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  comingSoon: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
})
