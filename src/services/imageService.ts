import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { PHOTO_MAX_WIDTH, PHOTO_QUALITY } from '../config/constants';

export async function pickImage(
  source: 'camera' | 'gallery',
): Promise<string | null> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    return result.canceled ? null : result.assets[0].uri;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  return result.canceled ? null : result.assets[0].uri;
}

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: PHOTO_MAX_WIDTH } }],
    { compress: PHOTO_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function uploadPhoto(
  uri: string,
  userId: string,
  restaurantId: string,
): Promise<string> {
  const compressed = await compressImage(uri);
  const response = await fetch(compressed);
  const blob = await response.blob();

  const photoRef = ref(storage, `photos/${userId}/${restaurantId}.jpg`);
  await uploadBytes(photoRef, blob);
  return getDownloadURL(photoRef);
}

export async function uploadPhotos(
  uris: string[],
  userId: string,
  restaurantId: string,
): Promise<string[]> {
  return Promise.all(
    uris.map(async (uri, i) => {
      const compressed = await compressImage(uri);
      const response = await fetch(compressed);
      const blob = await response.blob();
      const photoRef = ref(storage, `photos/${userId}/${restaurantId}_${i}.jpg`);
      await uploadBytes(photoRef, blob);
      return getDownloadURL(photoRef);
    }),
  );
}

export async function uploadAvatar(
  uri: string,
  userId: string,
): Promise<string> {
  const compressed = await compressImage(uri);
  const response = await fetch(compressed);
  const blob = await response.blob();

  const photoRef = ref(storage, `avatars/${userId}.jpg`);
  await uploadBytes(photoRef, blob);
  return getDownloadURL(photoRef);
}
