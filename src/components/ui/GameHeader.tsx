import { ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { vault, gold, ink, semantic, fontSize } from '../../theme'

interface Props {
  title: string
  /** null = ライフ無制限(∞表示), undefined = ライフ非表示 */
  lives?: number | null
  maxLives?: number
  score?: number
  onUndo?: () => void
  onRestart?: () => void
  onSettings?: () => void
  /** ヘッダー右端への追加要素 */
  right?: ReactNode
}

export function GameHeader({ title, lives, maxLives = 3, score, onUndo, onRestart, onSettings, right }: Props) {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.actions}>
          {score !== undefined && <Text style={styles.score}>スコア: {score}</Text>}
          {onUndo && <IconAction label="↩" onPress={onUndo} />}
          {onRestart && <IconAction label="↺" onPress={onRestart} />}
          {onSettings && <IconAction label="⚙" onPress={onSettings} />}
          {lives !== undefined && (
            <Text style={styles.lives}>
              {lives === null
                ? '∞'
                : Array.from({ length: maxLives }, (_, i) => (i < lives ? '♥' : '♡')).join('')}
            </Text>
          )}
          {right}
        </View>
      </View>
    </View>
  )
}

function IconAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.iconButton}>
      <Text style={styles.iconText}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: vault.surface,
    borderBottomWidth: 1,
    borderBottomColor: vault.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4, minWidth: 60 },
  backText: { fontSize: fontSize.base, color: gold.accent },
  title: { fontSize: fontSize.md, fontWeight: 'bold', color: ink.strong },
  actions: {
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  score: { fontSize: fontSize.sm, color: ink.body, fontVariant: ['tabular-nums'] },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: vault.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18, color: gold.accent },
  lives: { fontSize: fontSize.base, color: semantic.danger, letterSpacing: 2 },
})
