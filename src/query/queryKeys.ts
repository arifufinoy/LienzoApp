//TODO
export const queryKeys = {
  artworks: {
    all: ['artworks'] as const,
    lists: () => [...queryKeys.artworks.all, 'list'] as const,
    list: (page: number) => [...queryKeys.artworks.lists(), page] as const,
    detail: (id: number) => [...queryKeys.artworks.all, 'detail', id] as const,
  },
  collection: {
    all: ['collection'] as const,
    list: () => [...queryKeys.collection.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.collection.all, 'detail', id] as const,
  },
};
//TODO
export const mutationKeys = {
  all: ['collection-write'] as const,
  create: ['collection-write', 'create'] as const,
  edit: ['collection-write', 'edit'] as const,
};
