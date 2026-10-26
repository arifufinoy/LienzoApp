import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { api, HttpError } from '@/services/api';
import { mutationKeys, queryKeys } from './queryKeys';
import type { CollectionItem } from '@/types/art';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { errorMessage, logEvent } from '@/services/diagnostics';

const minute = 60_000;
const hour = 60 * minute;
//TODO 
export const MAX_AGE = 24 * hour;
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, gcTime: 72 * hour },
    mutations: {
      networkMode: 'online', gcTime: 72 * hour,
      retry: (count, error) => !(error instanceof HttpError && error.status < 500) && count < 2,
    },
  },
});
//TODO 
queryClient.setQueryDefaults(queryKeys.artworks.all, { staleTime: 60 * minute, gcTime: 48 * hour });
queryClient.setQueryDefaults(queryKeys.collection.all, { staleTime: 2 * minute, gcTime: 72 * hour });

queryClient.getMutationCache().subscribe(event => {
  if (!event.mutation || (event.type !== 'updated' && event.type !== 'added')) return;
  const mutation = event.mutation;
  const key = mutation.options.mutationKey;
  if (key?.[0] !== mutationKeys.all[0]) return;
  const input = mutation.state.variables as { artworkId?: number; id?: string } | undefined;
  const operation = `${key[1] === 'create' ? 'Creación' : 'Edición'} ${input?.artworkId !== undefined ? `artworkId=${input.artworkId}` : `id=${input?.id ?? '?'}`}`;
  if (event.type === 'added') {
    if (mutation.state.status === 'pending') logEvent(`${operation}: operación pendiente recuperada del almacenamiento.`);
    return;
  }
  switch (event.action.type) {
    case 'pending': logEvent(`${operation}: cambio pendiente en la cola local; aún no sincronizado.`); break;
    case 'pause': logEvent(`${operation}: pausada; esperando red o turno de envío.`); break;
    case 'continue': logEvent(`${operation}: reanudada automáticamente; aún pendiente de confirmación.`); break;
    case 'success': {
      const item = mutation.state.data as CollectionItem;
      logEvent(`${operation}: sincronización completada; MockAPI id=${item.id}.`);
      break;
    }
    case 'error': logEvent(`${operation}: no se sincronizó. ${errorMessage(mutation.state.error)}`, 'error'); break;
    case 'failed': logEvent(`${operation}: intento fallido; TanStack gestionará el reintento.`, 'error'); break;
  }
});

//TODO 
async function reconcile(item: CollectionItem) {
  await queryClient.cancelQueries({ queryKey: queryKeys.collection.all });
  queryClient.setQueryData(queryKeys.collection.detail(item.id), item);
  queryClient.setQueryData<CollectionItem[]>(queryKeys.collection.list(), old =>
    [item, ...(old ?? []).filter(row => row.id !== item.id && Number(row.artworkId) !== Number(item.artworkId))]);

  //TODO 
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.collection.list() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.collection.detail(item.id) }),
  ]);
  logEvent(`Caché personal reconciliada con MockAPI id=${item.id}; listado y detalle invalidados.`);
}

//TODO 
queryClient.setMutationDefaults(mutationKeys.create, {
  mutationFn: api.create, scope: { id: 'collection-writes' }, onSuccess: reconcile,
});
queryClient.setMutationDefaults(mutationKeys.edit, {
  mutationFn: api.edit, scope: { id: 'collection-writes' }, onSuccess: reconcile,
});
let lastSavedSummary = '';

//TODO 
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: async key => {
      logEvent('AsyncStorage: leyendo caché y operaciones guardadas.');
      try {
        const value = await AsyncStorage.getItem(key);
        logEvent(value ? 'AsyncStorage: instantánea encontrada; se comprobará vigencia antes de hidratar.' : 'AsyncStorage: no hay instantánea previa.');
        return value;
      } catch (error) {
        logEvent(`AsyncStorage: fallo de lectura. ${errorMessage(error)}`, 'error');
        throw error;
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        logEvent(`AsyncStorage: fallo de escritura; persistencia NO confirmada. ${errorMessage(error)}`, 'error');
        throw error;
      }
      // Log only after the real write completes. Do not mistake serialization for saving.
      const snapshot = JSON.parse(value) as PersistedClient;
      const pending = snapshot.clientState.mutations.filter(mutation => mutation.state.status === 'pending');
      const summary = `${snapshot.clientState.queries.length}|${JSON.stringify(snapshot.clientState.mutations.map(mutation => [mutation.mutationKey, mutation.state.status, mutation.state.submittedAt]))}`;
      if (summary !== lastSavedSummary) {
        lastSavedSummary = summary;
        logEvent(`AsyncStorage: escritura completada; ${snapshot.clientState.queries.length} consultas y ${pending.length} operación(es) pendiente(s) guardadas en disco.`);
      }
    },
    removeItem: async key => {
      logEvent('AsyncStorage: TanStack descarta una instantánea vencida, incompatible o inválida.');
      await AsyncStorage.removeItem(key);
    },
  }, key: 'art-gallery-cache-v1', throttleTime: 0,
  // A process killed during an HTTP request must also recover that operation.
  serialize: client => JSON.stringify({
    ...client,
    clientState: {
      ...client.clientState,
      mutations: client.clientState.mutations.map(mutation => ({
        ...mutation,
        state: mutation.state.status === 'pending' ? { ...mutation.state, isPaused: true } : mutation.state,
      })),
    },
  }),
});
