import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../lib/app-state';
import { useColors } from '../lib/theme';

/** Entry gate: logged-in or guest users go to the tabs, everyone else to login. */
export default function Gate() {
  const { ready, session, guest, cloudEnabled, onboarded } = useApp();
  const c = useColors();
  if (!ready)
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.rose} />
      </View>
    );
  if (session || guest || !cloudEnabled) return <Redirect href={onboarded ? '/home' : '/onboarding'} />;
  return <Redirect href="/login" />;
}
