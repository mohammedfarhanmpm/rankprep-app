import { Tabs } from 'expo-router';
import { ColorValue, Text } from 'react-native';
import { useColors } from '../../lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20, fontWeight: '800' }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.rose,
        tabBarInactiveTintColor: c.mut,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon('✎') }} />
      <Tabs.Screen name="planner" options={{ title: 'Planner', tabBarIcon: icon('✓') }} />
      <Tabs.Screen name="pip" options={{ title: 'Ask PIP', tabBarIcon: icon('?') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('★') }} />
    </Tabs>
  );
}
