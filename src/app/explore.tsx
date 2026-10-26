import { FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useCacheEvidence, useCollectionView } from '@/hooks/use-gallery';
import { ArtImage, Button, Card, GalleryNav, QueryState } from '@/components/gallery-ui';
import { ui } from '@/constants/gallery-theme';

export default function CollectionScreen() {
  const { query, rows } = useCollectionView();
  useCacheEvidence('Mi colección', query.data !== undefined, query.isFetchedAfterMount);
  return <FlatList style={ui.screen} contentContainerStyle={ui.content} data={rows} keyExtractor={item => item.id}
    refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
    ListHeaderComponent={<View style={{ gap: 16 }}><GalleryNav collection /><Text style={ui.title}>Mi colección</Text><Text style={ui.text}>Arte que habla de ti. Tus notas, tus favoritos.</Text>
      {query.isError && rows.length > 0 && <Text style={ui.error}>No se pudo actualizar; conservamos tus datos. {query.error.message}</Text>}
    </View>}
    ListEmptyComponent={<QueryState loading={query.isLoading} error={query.error} empty="Tu colección está vacía. Guarda una obra desde Explorar." retry={() => void query.refetch()} />}
    renderItem={({ item }) => <Card>
      <ArtImage uri={item.imageUrl} title={item.title} /><Text style={ui.heading}>{item.favorite ? '★ ' : ''}{item.title}</Text><Text style={ui.muted}>{item.artist}</Text>
      <Text style={ui.text}>{item.note || 'Sin nota personal.'}</Text>
      <Text style={ui.badge}>{item.failed ? 'Error · reintenta desde el aviso superior' : item.pending ? 'Pendiente de sincronización' : 'Guardada en MockAPI'}</Text>
      {item.id.startsWith('pending:') ? <Text style={ui.muted}>Podrás editar cuando MockAPI confirme la creación.</Text> : <Button title="Editar nota y favorito" onPress={() => router.push({ pathname: '/edit/[id]', params: { id: item.id } })} />}
    </Card>} />;
}
