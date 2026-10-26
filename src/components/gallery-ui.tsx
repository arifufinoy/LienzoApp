import { useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { onlineManager, useIsRestoring } from '@tanstack/react-query';
import { useWrites } from '@/hooks/use-gallery';
import { palette, ui } from '@/constants/gallery-theme';

export function Card({ children }: PropsWithChildren) { return <View style={ui.card}>{children}</View>; }
export function Button({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.card, ui.button, { opacity: disabled ? 0.5 : 1, backgroundColor: pressed ? '#DCE3EC' : palette.background, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    <Text style={ui.buttonText}>{title}</Text>
  </Pressable>;
}
export function ArtImage({ uri, title }: { uri: string; title: string }) {
  const [failedUri, setFailedUri] = useState<string>();
  if (!uri || failedUri === uri) return <View style={[ui.image, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
    <Text style={ui.heading}>◇</Text><Text style={ui.muted}>Imagen no disponible</Text>
  </View>;
  return <Image source={{ uri }} accessibilityLabel={title} style={ui.image} resizeMode="contain" onError={() => setFailedUri(uri)} />;
}
export function QueryState({ loading, error, empty, retry }: { loading?: boolean; error?: Error | null; empty?: string; retry?: () => void }) {
  return <Card>
    {loading ? <><ActivityIndicator color={palette.accent} /><Text style={ui.muted}>Cargando galería…</Text></> :
      error ? <><Text style={ui.error}>{error.message}</Text>{retry && <Button title="Reintentar" onPress={retry} />}</> : <Text style={ui.muted}>{empty ?? 'Sin datos disponibles en este dispositivo.'}</Text>}
  </Card>;
}
export function GalleryNav({ collection = false }: { collection?: boolean }) {
  return <View style={ui.row}>
    <Link href="/" style={[ui.buttonText, { padding: 12, opacity: collection ? 0.6 : 1 }]}>Explorar</Link>
    <Link href="/explore" style={[ui.buttonText, { padding: 12, opacity: collection ? 1 : 0.6 }]}>Mi colección</Link>
  </View>;
}
export function SyncStatus() {
  const online = useSyncExternalStore(callback => onlineManager.subscribe(callback), () => onlineManager.isOnline(), () => false);
  const restoring = useIsRestoring();
  const writes = useWrites();
  const pending = writes.filter(write => write.status === 'pending');
  const errors = writes.filter(write => write.status === 'error');
  const succeeded = writes.some(write => write.status === 'success');
  return <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: 22, paddingVertical: 10, gap: 8, backgroundColor: palette.background }}>
    <Text style={ui.badge}>{restoring ? 'Restaurando caché…' : !online ? '● Sin conexión · datos guardados' : '● Con conexión'}</Text>
    {pending.length > 0 && <Text style={ui.muted}>{pending.length} cambio(s) pendiente(s) · {pending.some(write => write.paused) ? 'esperando sincronización' : 'sincronizando…'}</Text>}
    {!pending.length && !errors.length && succeeded && <Text style={ui.badge}>✓ Sincronización completada</Text>}
    {errors.map(write => <View key={write.submittedAt} style={ui.row}>
      <Text style={[ui.error, { flex: 1 }]}>No se sincronizó: {write.error?.message ?? 'Error de conexión'}</Text>
      <Pressable accessibilityRole="button" onPress={() => void write.retry()} style={{ padding: 12 }}><Text style={ui.buttonText}>Reintentar</Text></Pressable>
    </View>)}
  </View>;
}
