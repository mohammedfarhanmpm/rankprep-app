import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../lib/app-state';
import { PlannerProvider } from '../lib/planner';
import { useColors } from '../lib/theme';

function Root() {
  const c = useColors();
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="formulas" />
        <Stack.Screen name="mistakes" />
        <Stack.Screen name="flashcards" />
        <Stack.Screen name="relax" />
        <Stack.Screen name="vent" />
        <Stack.Screen name="syllabus" />
        <Stack.Screen name="timer" />
        <Stack.Screen name="focus" options={{ animation: "fade" }} />
        <Stack.Screen name="motivation" />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <PlannerProvider>
          <Root />
        </PlannerProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
