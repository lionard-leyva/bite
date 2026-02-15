export interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  note: string;
  photoURL: string | null;
  visited: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  listId: string;
}
