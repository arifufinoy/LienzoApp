import { useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useArtwork, useCollectionView, useCreate, useWrites } from '@/hooks/use-gallery';
import { imageUrl } from '@/services/api';
import { queryClient } from '@/query/client';
import { mutationKeys } from '@/query/queryKeys';
import type { CreateInput } from '@/types/art';
import { ArtImage, Button, Card, QueryState } from '@/components/gallery-ui';
import { palette, ui } from '@/constants/gallery-theme';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artworkId = Number(id);
  const query = useArtwork(artworkId);
  const { rows } = useCollectionView();
  const writes = useWrites();
  const create = useCreate();
  const [note, setNote] = useState('');
  const saved = rows.find(row => Number(row.artworkId) === artworkId);
  const blocked = !!saved || writes.some(write => 'artworkId' in write.variables && write.variables.artworkId === artworkId && (write.status === 'pending' || write.status === 'error'));
  const data = query.data?.data;
  const iiifUrl = query.data?.config?.iiif_url ?? '';
  const uri = data ? imageUrl(data.image_id, iiifUrl) : '';
  function save() {
    // Synchronous cache guard also covers two taps before React rerenders.
    const pending = queryClient.getMutationCache().findAll({ mutationKey: mutationKeys.create }).some(mutation => {
      const input = mutation.state.variables as CreateInput | undefined;
      return input?.artworkId === artworkId && (mutation.state.status === 'pending' || mutation.state.status === 'error');
    });
    if (!data || blocked || pending) return;
    create.mutate({ artworkId, title: data.title, artist: data.artist_display || 'Artista no identificado', imageUrl: uri, note: note.trim(), favorite: false, createdAt: new Date().toISOString() });
  }
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    {!data ? <QueryState loading={query.isLoading} error={query.error} empty="Detalle no disponible en caché o ID inválido." retry={() => void query.refetch()} /> : <>
      {query.isError && <Text style={ui.error}>Mostrando datos guardados. {query.error.message}</Text>}
      <Card><ArtImage uri={uri} title={data.title} /><Text style={ui.title}>{data.title}</Text><Text style={ui.text}>{data.artist_display || 'Artista no identificado'}</Text><Text style={ui.badge}>{data.date_display}</Text></Card>
      <Card><Text style={ui.heading}>Sobre la obra</Text>
        <Text style={ui.text}>{data.medium_display || 'Técnica no especificada'}</Text><Text style={ui.muted}>{data.dimensions}</Text><Text style={ui.muted}>{data.place_of_origin}</Text><Text style={ui.muted}>{data.credit_line}</Text>
      </Card>
      <Card><Text style={ui.heading}>Tu mirada personal</Text>
        <TextInput accessibilityLabel="Nota personal" placeholder="¿Qué te inspira esta obra?" placeholderTextColor={palette.muted} value={note} onChangeText={setNote} multiline maxLength={3000} style={ui.input} editable={!blocked} />
        <Button title={blocked ? 'Ya está guardada o pendiente' : 'Guardar en mi colección'} disabled={blocked || create.isPending} onPress={save} />
        {create.isError && <Text style={ui.error}>{create.error.message} La nota sigue pendiente; reintenta desde el aviso superior.</Text>}
        <Button title="Ir a mi colección" onPress={() => router.push('/explore')} />
      </Card>
    </>}
  </ScrollView>;
}
