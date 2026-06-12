import { View, Text, StyleSheet } from 'react-native'
import { vault, ink, fontSize } from '../../theme'

/** 盤面上部のルール説明・状態表示帯 */
export function InfoBanner({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: vault.surface,
    borderBottomWidth: 1,
    borderBottomColor: vault.border,
  },
  text: { fontSize: fontSize.xs, color: ink.muted, textAlign: 'center' },
})
