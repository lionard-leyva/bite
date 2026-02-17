import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadPhoto } from './imageService';

interface SaveRestaurantInput {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  note: string;
  visited: boolean;
  photoUri: string | null;
  pricePerPerson?: number;
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

  const isUpdate = !!input.id;

  if (isUpdate) {
    // Idempotent update — PUT semantics
    const ref = doc(db, 'restaurants', input.id!);
    await setDoc(ref, {
      name: input.name,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      rating: input.rating,
      note: input.note,
      visited: input.visited,
      pricePerPerson: input.pricePerPerson ?? 20,
      createdBy: input.userId,
      updatedAt: serverTimestamp(),
      listId: input.listId,
    }, { merge: true });

    if (input.photoUri && !input.photoUri.startsWith('http')) {
      const photoURL = await uploadPhoto(input.photoUri, input.userId, input.id!);
      await updateDoc(ref, { photoURL });
    }

    return input.id!;
  }

  // Create — POST semantics
  const docRef = await addDoc(collection(db, 'restaurants'), {
    name: input.name,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    rating: input.rating,
    note: input.note,
    visited: input.visited,
    pricePerPerson: input.pricePerPerson ?? 20,
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
