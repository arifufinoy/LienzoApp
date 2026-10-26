import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { MAX_AGE, persister, queryClient } from './client';
import { errorMessage, logEvent } from '@/services/diagnostics';
import { queryKeys } from './queryKeys';
import type { CollectionItem } from '@/types/art';

// Be conservative until the initial native connectivity check completes.
onlineManager.setOnline(false);
export function QueryProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    logEvent('Inicio de sesión de la app: comprobando red antes de restaurar la caché.');
    let active = true;
    let generation = 0;
    let lastOnline: boolean | undefined;
    const update = (state: Network.NetworkState) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online !== lastOnline) {
        lastOnline = online;
        logEvent(online ? 'Red: conexión disponible; TanStack puede continuar solicitudes pendientes.' : 'Red: sin conexión; las mutaciones quedan pendientes, no sincronizadas.');
      }
      //TODO 
      onlineManager.setOnline(online);
    };
    const refresh = async () => {
      const version = ++generation;
      try {
        const state = await Network.getNetworkStateAsync();
        if (active && generation === version) update(state);
      } catch (error) {
        logEvent(`Red: no se pudo comprobar el estado; se conserva el último conocido. ${errorMessage(error)}`, 'error');
      }
      finally { if (active) setReady(true); }
    };
    //TODO 
    const network = Network.addNetworkStateListener(state => { generation++; update(state); });
    const app = AppState.addEventListener('change', state => {
      logEvent(`Ciclo de vida: ${state}.`);
      focusManager.setFocused(state === 'active');
      if (state === 'active') void refresh();
    });
    void refresh();
    return () => { active = false; network.remove(); app.remove(); };
  }, []);
  if (!ready) return null;

  //TODO 
  return <PersistQueryClientProvider client={queryClient} persistOptions={{
    persister, maxAge: MAX_AGE, buster: 'gallery-v1',
    dehydrateOptions: {
      shouldDehydrateQuery: query => query.state.data !== undefined,
      shouldDehydrateMutation: mutation => mutation.state.status === 'pending' || mutation.state.status === 'error',
    },
    
  }} onSuccess={() => {
    const cached = queryClient.getQueryCache().getAll().filter(query => query.state.data !== undefined);
    const collection = queryClient.getQueryData<CollectionItem[]>(queryKeys.collection.list());
    const pending = queryClient.getMutationCache().getAll().filter(mutation => mutation.state.status === 'pending');
    logEvent(`Restauración completada: ${cached.length} consultas con datos en caché; ${collection?.length ?? 0} registros personales; ${pending.length} operación(es) pendiente(s). Los datos están disponibles sin esperar nuevos GET.`);
    logEvent('Reanudación automática: llamando resumePausedMutations(); esto NO confirma sincronización.');


    //TODO 
    void queryClient.resumePausedMutations().catch(error => {
      logEvent(`Reanudación: ${errorMessage(error)}`, 'error');
    });
  }} onError={() => {
    logEvent('Restauración fallida: no se puede confirmar recuperación de la caché anterior.', 'error');
  }}>
    {children}
  </PersistQueryClientProvider>;
}
