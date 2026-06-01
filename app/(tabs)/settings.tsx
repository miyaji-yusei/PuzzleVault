import { StyleSheet, View, Text, Switch } from 'react-native'
import { useSettingsStore } from '../../src/stores/settingsStore'

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
          <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>振動</Text>
          <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
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
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
})
