import { useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { diagnosticStore } from '@/services/diagnostics';
import { palette, ui } from '@/constants/gallery-theme';

function LogHistory() {
  const entries = useSyncExternalStore(diagnosticStore.subscribe, diagnosticStore.getSnapshot, diagnosticStore.getSnapshot);
  return <>
    <Text style={ui.muted}>Hora local · sesión actual · más recientes arriba</Text>
    <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
      {entries.length === 0 && <Text style={ui.muted}>Sin eventos registrados en esta sesión.</Text>}
      {[...entries].reverse().map(entry => <Text key={entry.id} selectable style={{
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18,
        color: entry.level === 'error' ? palette.error : palette.text,
      }}>[{entry.time}] {entry.message}</Text>)}
    </ScrollView>
  </>;
}

export function DiagnosticsPanel() {
  const [expanded, setExpanded] = useState(false);
  return <View style={{ paddingHorizontal: 22, paddingBottom: 10, backgroundColor: palette.background }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ paddingVertical: 10, minHeight: 44 }}>
      <Text style={ui.buttonText}>{expanded ? 'Ocultar logs de sincronización ▴' : 'Ver logs de sincronización ▾'}</Text>
    </Pressable>
    {expanded && <View style={[ui.card, { padding: 12, gap: 4 }]}><LogHistory /></View>}
  </View>;
}
