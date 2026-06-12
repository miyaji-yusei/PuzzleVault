import { Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native'
import { vault, gold, ink, semantic, radii, fontSize } from '../../theme'

type Variant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, textStyles[variant], disabled && styles.disabledLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: gold.accent },
  secondary: { backgroundColor: vault.card, borderWidth: 1, borderColor: vault.borderLight },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: gold.deep },
  text: { backgroundColor: 'transparent', paddingVertical: 8 },
  danger: { backgroundColor: semantic.danger },
  disabled: { backgroundColor: vault.border, borderColor: vault.border },
  label: { fontSize: fontSize.base, fontWeight: '700' },
  disabledLabel: { color: ink.faint },
})

const textStyles = StyleSheet.create({
  primary: { color: ink.onGold },
  secondary: { color: ink.strong },
  outline: { color: gold.accent },
  text: { color: gold.accent },
  danger: { color: '#fff' },
})
