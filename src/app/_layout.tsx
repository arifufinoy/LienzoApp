import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryProvider } from '@/query/Provider';
import { SyncStatus } from '@/components/gallery-ui';
import { DiagnosticsPanel } from '@/components/diagnostics-panel';
import { palette, ui } from '@/constants/gallery-theme';

export default function RootLayout() {
  return <SafeAreaProvider><QueryProvider>
    <SafeAreaView style={ui.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <SyncStatus />
      <DiagnosticsPanel />
      <Stack screenOptions={{ headerStyle: { backgroundColor: palette.background }, headerTintColor: palette.text, headerShadowVisible: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="artwork/[id]" options={{ title: 'Detalle de obra' }} />
        <Stack.Screen name="edit/[id]" options={{ title: 'Editar colección' }} />
      </Stack>
    </SafeAreaView>
  </QueryProvider></SafeAreaProvider>;
}
