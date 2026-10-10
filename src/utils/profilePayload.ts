import { deleteField } from 'firebase/firestore';

export interface ProfileInput {
  displayName: string;
  bio: string;
  birthday: string;
  city: string;
  address: string;
  photoURL: string | null;
  cityLat: number | null;
  cityLng: number | null;
  addressLat: number | null;
  addressLng: number | null;
}

// Con merge, un campo que no va en el documento conserva el valor anterior: si Ana cambia la ciudad a mano,
// sus coordenadas viejas se borran explicitamente (PRF-02).
export function buildProfilePayload(input: ProfileInput): Record<string, unknown> {
  return {
    displayName: input.displayName,
    bio: input.bio,
    birthday: input.birthday,
    city: input.city,
    address: input.address,
    photoURL: input.photoURL,
    cityLat: input.cityLat ?? deleteField(),
    cityLng: input.cityLng ?? deleteField(),
    addressLat: input.addressLat ?? deleteField(),
    addressLng: input.addressLng ?? deleteField(),
  };
}
