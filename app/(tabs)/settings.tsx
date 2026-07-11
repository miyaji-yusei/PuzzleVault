import { StyleSheet, View, Text, Switch } from 'react-native'
import { useSettingsStore } from '../../src/stores/settingsStore'
import { vault, gold, ink, fontSize, radii } from '../../src/theme'

export default function SettingsScreen() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled)
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled)
  const setVibrationEnabled = useSettingsStore(
    (state) => state.setVibrationEnabled
  )

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サウンド・振動</Text>
        <View style={styles.row}>
          <Text style={styles.label}>効果音</Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ true: gold.deep }}
            thumbColor={soundEnabled ? gold.accent : undefined}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>振動</Text>
          <Switch
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            trackColor={{ true: gold.deep }}
            thumbColor={vibrationEnabled ? gold.accent : undefined}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: vault.bg,
    padding: 16,
  },
  section: {
    backgroundColor: vault.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: vault.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: ink.muted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: fontSize.base,
    color: ink.strong,
  },
  divider: {
    height: 1,
    backgroundColor: vault.border,
  },
})
