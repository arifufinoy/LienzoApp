import { useEffect, useRef } from 'react';
import { useIsRestoring, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { mutationKeys, queryKeys } from '@/query/queryKeys';
import type { CollectionItem, CreateInput, EditInput } from '@/types/art';
import { logEvent } from '@/services/diagnostics';

export function useCacheEvidence(label: string, hasData: boolean, fetchedAfterMount: boolean) {
  const restoring = useIsRestoring();
  const lastLogged = useRef('');
  useEffect(() => {
    if (!restoring && hasData && !fetchedAfterMount && lastLogged.current !== label) {
      lastLogged.current = label;
      logEvent(`Vista ${label}: datos mostrados desde caché sin esperar un nuevo GET.`);
    }
  }, [label, hasData, fetchedAfterMount, restoring]);
}

export function useArtworks(page: number) {
  const query = useQuery({ queryKey: queryKeys.artworks.list(page), queryFn: () => api.artworks(page) });
  useCacheEvidence(`Explorar página ${page}`, query.data !== undefined, query.isFetchedAfterMount);
  return query;
}
export const useArtwork = (id: number) => useQuery({ queryKey: queryKeys.artworks.detail(id), queryFn: () => api.artwork(id), enabled: Number.isInteger(id) && id > 0 });
export function useCollection() {
  const query = useQuery({ queryKey: queryKeys.collection.list(), queryFn: api.collection });
  return query;
}
export const useSaved = (id: string) => useQuery({ queryKey: queryKeys.collection.detail(id), queryFn: () => api.saved(id), enabled: !!id && !id.startsWith('pending:') });


//TODO 
export const useCreate = () => useMutation<CollectionItem, Error, CreateInput>({ mutationKey: mutationKeys.create });
export const useEdit = () => useMutation<CollectionItem, Error, EditInput>({ mutationKey: mutationKeys.edit });
export function useWrites() {
  return useMutationState({ filters: { mutationKey: mutationKeys.all }, select: mutation => ({
    key: mutation.options.mutationKey,
    variables: mutation.state.variables as CreateInput | EditInput,
    status: mutation.state.status,
    paused: mutation.state.isPaused,
    error: mutation.state.error,
    submittedAt: mutation.state.submittedAt,
    retry: () => mutation.execute(mutation.state.variables).catch(() => undefined),
  }) });
}
export function useCollectionView() {
  const query = useCollection();
  const writes = useWrites();
  const rows: (CollectionItem & { pending?: boolean; failed?: boolean })[] = [...(query.data ?? [])];
  for (const write of writes) {
    if (write.status !== 'pending' && write.status !== 'error') continue;
    if ('artworkId' in write.variables) {
      const input = write.variables;
      const index = rows.findIndex(row => Number(row.artworkId) === input.artworkId);
      if (index === -1) {
        rows.unshift({ ...input, id: `pending:${input.artworkId}`, pending: write.status === 'pending', failed: write.status === 'error' });
      } else {
        rows[index] = { ...rows[index], pending: write.status === 'pending', failed: write.status === 'error' };
      }
    } else {
      const index = rows.findIndex(row => row.id === (write.variables as EditInput).id);
      if (index !== -1) rows[index] = { ...rows[index], ...write.variables, pending: write.status === 'pending', failed: write.status === 'error' };
    }
  }
  return { query, rows };
}
