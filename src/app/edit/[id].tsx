import { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useCollectionView, useEdit, useSaved, useWrites } from '@/hooks/use-gallery';
import type { CollectionItem, EditInput } from '@/types/art';
import { queryClient } from '@/query/client';
import { mutationKeys } from '@/query/queryKeys';
import { ArtImage, Button, Card, QueryState } from '@/components/gallery-ui';
import { palette, ui } from '@/constants/gallery-theme';

function EditForm({ item }: { item: CollectionItem }) {
  const [note, setNote] = useState(item.note);
  const [favorite, setFavorite] = useState(item.favorite);
  const edit = useEdit();
  const writes = useWrites();
  const blocked = writes.some(write => 'id' in write.variables && write.variables.id === item.id && (write.status === 'pending' || write.status === 'error'));
  function save() {
    const busy = queryClient.getMutationCache().findAll({ mutationKey: mutationKeys.edit }).some(mutation =>
      (mutation.state.variables as EditInput | undefined)?.id === item.id && (mutation.state.status === 'pending' || mutation.state.status === 'error'));
    if (!busy) edit.mutate({ id: item.id, note: note.trim(), favorite });
  }
  return <>
    <Card><ArtImage uri={item.imageUrl} title={item.title} /><Text style={ui.heading}>{item.title}</Text><Text style={ui.muted}>{item.artist}</Text></Card>
    <Card><Text style={ui.heading}>Nota personal</Text><TextInput accessibilityLabel="Editar nota personal" placeholder="Escribe una nota…" placeholderTextColor={palette.muted} value={note} onChangeText={setNote} multiline maxLength={3000} style={ui.input} editable={!blocked} />
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.text}>Marcar como favorito</Text><Switch accessibilityLabel="Favorito" value={favorite} onValueChange={setFavorite} disabled={blocked} trackColor={{ true: palette.accent }} /></View>
      <Button title={blocked ? 'Cambio pendiente de sincronización' : 'Guardar cambios'} onPress={save} disabled={blocked || edit.isPending} />
      {edit.isError && <Text style={ui.error}>{edit.error.message}</Text>}
      {edit.isSuccess && !blocked && <Text style={ui.badge}>✓ Cambios sincronizados con MockAPI</Text>}
      <Text style={ui.muted}>Sin conexión, los cambios quedan en cola y se enviarán al reconectar con la aplicación abierta.</Text>
    </Card>
  </>;
}
export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useSaved(id);
  const { rows } = useCollectionView();
  const item = rows.find(row => row.id === id) ?? query.data;
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    {query.isError && item && <Text style={ui.error}>No se pudo actualizar; editando datos locales. {query.error.message}</Text>}
    {item ? <EditForm key={id} item={item} /> : <QueryState loading={query.isLoading} error={query.error} empty="Registro no disponible en caché." retry={() => void query.refetch()} />}
  </ScrollView>;
}
