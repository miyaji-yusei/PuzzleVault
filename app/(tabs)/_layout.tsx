import { Tabs } from 'expo-router'
import { vault, gold, ink } from '../../src/theme'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: vault.surface },
        headerTitleStyle: { color: ink.strong },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: vault.surface, borderTopColor: vault.border },
        tabBarActiveTintColor: gold.accent,
        tabBarInactiveTintColor: ink.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ゲーム',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定' }}
      />
    </Tabs>
  )
}
