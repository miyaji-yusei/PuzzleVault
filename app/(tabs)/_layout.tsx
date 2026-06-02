import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ゲーム',
          headerTitle: 'PuzzleVault',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定' }}
      />
    </Tabs>
  )
}
