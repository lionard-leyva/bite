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
import { uploadPhotos } from './imageService';
import { UserError } from '../utils/userError';

interface SaveRestaurantInput {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  note: string;
  visited: boolean;
  photoUris: string[];
  pricePerPerson?: number;
  userId: string;
  listId: string;
}

export async function saveRestaurant(
  input: SaveRestaurantInput,
): Promise<string> {
  console.warn('[saveRestaurant] Saving with listId:', input.listId, 'userId:', input.userId);

  if (!input.listId || input.listId === 'local') {
    throw new UserError(
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

    if (input.photoUris.length > 0) {
      const existingUrls = input.photoUris.filter((u) => u.startsWith('http'));
      const localUris = input.photoUris.filter((u) => !u.startsWith('http'));
      const newUrls = localUris.length > 0
        ? await uploadPhotos(localUris, input.userId, input.id!)
        : [];
      const allUrls = [...existingUrls, ...newUrls];
      await updateDoc(ref, {
        photoURL: allUrls[0] ?? null,
        photoURLs: allUrls,
      });
    }

    return input.id!;
  }

  // Create — POST semantics (optimistic: return immediately, upload photos in background)
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
    photoURLs: [],
    createdBy: input.userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    listId: input.listId,
  });

  if (input.photoUris.length > 0) {
    // Fire-and-forget: upload photos in background, update doc when done
    uploadPhotos(input.photoUris, input.userId, docRef.id)
      .then((urls) =>
        updateDoc(doc(db, 'restaurants', docRef.id), {
          photoURL: urls[0] ?? null,
          photoURLs: urls,
        }),
      )
      .catch((err) => console.error('[saveRestaurant] Background photo upload failed:', err));
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
