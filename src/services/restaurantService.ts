import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadPhoto } from './imageService';

interface SaveRestaurantInput {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  note: string;
  visited: boolean;
  photoUri: string | null;
  userId: string;
  listId: string;
}

export async function saveRestaurant(
  input: SaveRestaurantInput,
): Promise<string> {
  if (!input.listId || input.listId === 'local') {
    throw new Error(
      'No se pudo determinar tu lista. Cierra sesion y vuelve a iniciar.',
    );
  }

  const docRef = await addDoc(collection(db, 'restaurants'), {
    name: input.name,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    rating: input.rating,
    note: input.note,
    visited: input.visited,
    photoURL: null,
    createdBy: input.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    listId: input.listId,
  });

  if (input.photoUri) {
    const photoURL = await uploadPhoto(
      input.photoUri,
      input.userId,
      docRef.id,
    );
    await updateDoc(doc(db, 'restaurants', docRef.id), { photoURL });
  }

  return docRef.id;
}

export async function toggleVisited(
  restaurantId: string,
  visited: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId), {
    visited,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRestaurant(restaurantId: string): Promise<void> {
  await deleteDoc(doc(db, 'restaurants', restaurantId));
}
