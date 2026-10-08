import { saveRestaurant } from './restaurantService';
import { getLocalRestaurants, deleteLocalRestaurant, clearLocalRestaurants } from './localStorageService';

const BATCH_SIZE = 5;

/**
 * Copies the restaurants saved on the device (skip mode) into the account's list. Each one leaves the
 * local copy as soon as its own save succeeded, so a failure halfway loses nothing and a retry only sends
 * what is still pending (no duplicates). Throws the first failure after finishing the batch.
 * Returns how many this run migrated.
 */
export async function migrateLocalRestaurants(params: { userId: string; listId: string }): Promise<number> {
  const { userId, listId } = params;
  const locals = await getLocalRestaurants();
  if (locals.length === 0) return 0;

  for (let i = 0; i < locals.length; i += BATCH_SIZE) {
    const batch = locals.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
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

    // One at a time: deleteLocalRestaurant rewrites the shared cache, so parallel deletes would overwrite each other.
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') await deleteLocalRestaurant(batch[j].id);
    }
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) throw failed.reason;
  }

  await clearLocalRestaurants();
  return locals.length;
}
