export interface Artwork {
  id: number;
  title: string;
  artist_display: string;
  image_id: string | null;
  date_display?: string;
  medium_display?: string;
  dimensions?: string;
  credit_line?: string;
  place_of_origin?: string;
}
export interface ArtResponse<T> {
  data: T;
  config: { iiif_url: string };
  pagination?: { current_page: number; total_pages: number };
}
export interface CollectionItem {
  id: string;
  artworkId: number;
  title: string;
  artist: string;
  imageUrl: string;
  note: string;
  favorite: boolean;
  createdAt: string;
}
export type CreateInput = Omit<CollectionItem, 'id'>;
export interface EditInput {
  id: string;
  note: string;
  favorite: boolean;
}
