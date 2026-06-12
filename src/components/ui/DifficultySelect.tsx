import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { Difficulty } from '../../types/engine'
import { DIFFICULTY_LABELS } from '../../utils/difficulty'
import { vault, gold, ink, fontSize, radii } from '../../theme'

interface Props {
  options: Difficulty[]
  selected: Difficulty
  onSelect: (d: Difficulty) => void
}

/** 難易度選択ボタン列（全ゲーム共通） */
export function DifficultySelect({ options, selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {options.map((d) => {
        const active = d === selected
        return (
          <TouchableOpacity
            key={d}
            onPress={() => onSelect(d)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{DIFFICULTY_LABELS[d]}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: vault.card,
    borderWidth: 1,
    borderColor: vault.borderLight,
  },
  chipActive: { backgroundColor: gold.accent, borderColor: gold.accent },
  label: { fontSize: fontSize.sm, color: ink.body, fontWeight: '600' },
  labelActive: { color: ink.onGold },
})
