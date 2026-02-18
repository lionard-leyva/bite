import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Restaurant } from '../types';

const KEYS = {
  DEVICE_ID: '@bite:deviceId',
  RESTAURANTS: '@bite:restaurants',
  SKIP_MODE: '@bite:skipMode',
};

let _cache: Restaurant[] | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(KEYS.DEVICE_ID);
  if (!id) {
    id = 'device-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await AsyncStorage.setItem(KEYS.DEVICE_ID, id);
  }
  return id;
}

export async function setSkipMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.SKIP_MODE, JSON.stringify(enabled));
}

export async function getSkipMode(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.SKIP_MODE);
  return val ? JSON.parse(val) : false;
}

export async function getLocalRestaurants(): Promise<Restaurant[]> {
  if (_cache !== null) return _cache;
  const raw = await AsyncStorage.getItem(KEYS.RESTAURANTS);
  _cache = raw ? JSON.parse(raw) : [];
  return _cache!;
}

async function persistCache(): Promise<void> {
  await AsyncStorage.setItem(KEYS.RESTAURANTS, JSON.stringify(_cache));
}

export async function saveLocalRestaurant(restaurant: Restaurant): Promise<void> {
  const existing = await getLocalRestaurants();
  existing.push(restaurant);
  _cache = existing;
  await persistCache();
}

export async function clearLocalRestaurants(): Promise<void> {
  _cache = null;
  await AsyncStorage.removeItem(KEYS.RESTAURANTS);
}

export async function updateLocalRestaurant(updated: Restaurant): Promise<void> {
  const existing = await getLocalRestaurants();
  _cache = existing.map((r) =>
    r.id === updated.id ? { ...updated, updatedAt: new Date() } : r,
  );
  await persistCache();
}

export async function deleteLocalRestaurant(id: string): Promise<void> {
  const existing = await getLocalRestaurants();
  _cache = existing.filter((r) => r.id !== id);
  await persistCache();
}

export async function updateLocalRestaurantVisited(id: string, visited: boolean): Promise<void> {
  const existing = await getLocalRestaurants();
  _cache = existing.map((r) =>
    r.id === id ? { ...r, visited, updatedAt: new Date() } : r,
  );
  await persistCache();
}

export async function getLocalRestaurantCount(): Promise<number> {
  const list = await getLocalRestaurants();
  return list.length;
}
