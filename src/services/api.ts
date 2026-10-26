import type { Artwork, ArtResponse, CollectionItem, CreateInput, EditInput } from '@/types/art';
import { errorMessage, logEvent } from './diagnostics';

const ART_URL = 'https://api.artic.edu/api/v1';
const fields = 'id,title,artist_display,image_id,date_display,medium_display,dimensions,credit_line,place_of_origin';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const method = init?.method ?? 'GET';
  const target = `${url.startsWith(ART_URL) ? 'Museo' : 'MockAPI'} ${url.split('?')[0].split('/').slice(-2).join('/')}`;
  logEvent(`HTTP ${method} ${target}: envío iniciado.`);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new HttpError(response.status, `La solicitud falló (HTTP ${response.status}). Intenta nuevamente.`);
    const data = await response.json() as T;
    logEvent(`HTTP ${method} ${target}: respuesta ${response.status} recibida.`);
    return data;
  } catch (error) {
    logEvent(`HTTP ${method} ${target}: ${errorMessage(error)}`, 'error');
    throw error;
  } finally { clearTimeout(timeout); }
}
function collectionUrl(id?: string) {
  const base = process.env.EXPO_PUBLIC_MOCKAPI_BASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('Falta EXPO_PUBLIC_MOCKAPI_BASE_URL en la configuración.');
  return `${base}/coleccion${id ? `/${encodeURIComponent(id)}` : ''}`;
}
export const api = {
  artworks: (page: number) => http<ArtResponse<Artwork[]>>(`${ART_URL}/artworks?page=${page}&limit=20&fields=${fields}`),
  artwork: (id: number) => http<ArtResponse<Artwork>>(`${ART_URL}/artworks/${id}?fields=${fields}`),
  collection: () => http<CollectionItem[]>(collectionUrl()),
  saved: (id: string) => http<CollectionItem>(collectionUrl(id)),
  create: async (input: CreateInput) => {
    // Also makes retries safe when a POST succeeded but its response was lost.
    const existing = (await api.collection()).find(item => Number(item.artworkId) === input.artworkId);
    if (existing) {
      logEvent(`Creación artworkId=${input.artworkId}: ya existe id=${existing.id}; no se envía otro POST.`);
      return existing;
    }
    // Explicit whitelist: never send or replace MockAPI's generated id.
    const { artworkId, title, artist, imageUrl, note, favorite, createdAt } = input;
    return http<CollectionItem>(collectionUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId, title, artist, imageUrl, note, favorite, createdAt }),
    });
  },
  edit: ({ id, note, favorite }: EditInput) => http<CollectionItem>(collectionUrl(id), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note, favorite }),
  }),
};
export function imageUrl(imageId: string | null, iiif: string) {
  return imageId && iiif ? `${iiif}/${imageId}/full/843,/0/default.jpg` : '';
}
