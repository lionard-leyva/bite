import { saveRestaurant } from './restaurantService';
import { getLocalRestaurants, clearLocalRestaurants } from './localStorageService';

const BATCH_SIZE = 5;

/**
 * Copies the restaurants saved on the device (skip mode) into the account's list and, only if every
 * save succeeded, clears the local copy. Any failure throws before the clear, so nothing is lost.
 * Returns how many were migrated.
 */
export async function migrateLocalRestaurants(params: { userId: string; listId: string }): Promise<number> {
  const { userId, listId } = params;
  const locals = await getLocalRestaurants();
  if (locals.length === 0) return 0;

  for (let i = 0; i < locals.length; i += BATCH_SIZE) {
    const batch = locals.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((r) =>
        saveRestaurant({
          name: r.name,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          rating: r.rating,
          note: r.note,
          visited: r.visited,
          pricePerPerson: r.pricePerPerson,
          photoUris: r.photoURLs?.length ? r.photoURLs : r.photoURL ? [r.photoURL] : [],
          userId,
          listId,
        }),
      ),
    );
  }

  await clearLocalRestaurants();
  return locals.length;
}
