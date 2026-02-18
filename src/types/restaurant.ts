export interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  note: string;
  /** @deprecated Use getPrimaryPhoto() or photoURLs instead */
  photoURL: string | null;
  photoURLs?: string[];
  visited: boolean;
  pricePerPerson?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  listId: string;
}

export function getPrimaryPhoto(r: Restaurant): string | null {
  return r.photoURLs?.[0] ?? r.photoURL ?? null;
}
