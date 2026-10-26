import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useArtworks } from '@/hooks/use-gallery';
import { imageUrl } from '@/services/api';
import { ArtImage, Button, Card, GalleryNav, QueryState } from '@/components/gallery-ui';
import { ui } from '@/constants/gallery-theme';

export default function ExploreScreen() {
  const [page, setPage] = useState(1);
  const query = useArtworks(page);
  // Resolve optional query data before creating callbacks: React Compiler may
  // evaluate their dependencies while the first request is still pending.
  const artworks = query.data?.data ?? [];
  const iiifUrl = query.data?.config?.iiif_url ?? '';
  return <FlatList style={ui.screen} contentContainerStyle={ui.content}
    data={artworks} keyExtractor={item => String(item.id)}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
    ListHeaderComponent={<View style={{ gap: 16 }}><GalleryNav /><Text style={ui.muted}>ART INSTITUTE OF CHICAGO</Text><Text style={ui.title}>Una pausa para el arte</Text><Text style={ui.text}>Explora obras y conserva las que te inspiran.</Text>
      {query.data && query.isError && <Text style={ui.error}>No se pudo actualizar. Mostrando la caché: {query.error.message}</Text>}
    </View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${item.title}`} onPress={() => router.push({ pathname: '/artwork/[id]', params: { id: item.id } })}>
      <Card><ArtImage uri={imageUrl(item.image_id, iiifUrl)} title={item.title} /><Text style={ui.heading}>{item.title}</Text><Text style={ui.muted}>{item.artist_display || 'Artista no identificado'}</Text></Card>
    </Pressable>}
    ListEmptyComponent={<QueryState loading={query.isLoading} error={query.error} empty={query.fetchStatus === 'paused' ? 'Sin conexión. Aún no hay obras guardadas en caché para esta página.' : 'No hay obras disponibles.'} retry={() => void query.refetch()} />}
    ListFooterComponent={<View style={{ gap: 18 }}><Text style={ui.muted}>Página {page}</Text><View style={ui.row}>
      <Button title="Anterior" disabled={page === 1} onPress={() => setPage(page - 1)} />
      <Button title="Siguiente" disabled={!query.data || page >= (query.data.pagination?.total_pages ?? page)} onPress={() => setPage(page + 1)} />
    </View></View>} />;
}
