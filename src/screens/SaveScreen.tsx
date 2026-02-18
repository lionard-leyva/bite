import { useState, useReducer, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useUserLocation } from '../hooks/useLocation';
import { reverseGeocode } from '../services/locationService';
import { saveRestaurant } from '../services/restaurantService';
import { saveLocalRestaurant, updateLocalRestaurant, getLocalRestaurants } from '../services/localStorageService';
import type { RootStackParamList } from '../navigation/types';
import StarRating from '../components/StarRating';
import PriceSlider from '../components/PriceSlider';
import PhotoPicker from '../components/PhotoPicker';
import DragHandle from '../components/DragHandle';
import { PRICE_DEFAULT } from '../config/constants';

const MAPS_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

type SaveRoute = RouteProp<RootStackParamList, 'Save'>;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
      {children}
    </Text>
  );
}

function SaveHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <>
      <DragHandle />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#F0F0F0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={18} color="#222222" />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: '#1F2937',
          }}
        >
          {title}
        </Text>
        <View style={{ width: 32 }} />
      </View>
    </>
  );
}

function PhotoSection({
  photoUris,
  onPhotoAdded,
  onPhotoRemoved,
}: {
  photoUris: string[];
  onPhotoAdded: (uri: string) => void;
  onPhotoRemoved: (index: number) => void;
}) {
  return (
    <>
      <SectionLabel>Foto (opcional)</SectionLabel>
      <View className="mb-6">
        <PhotoPicker
          photoUris={photoUris}
          onPhotoAdded={onPhotoAdded}
          onPhotoRemoved={onPhotoRemoved}
        />
      </View>
    </>
  );
}

export default function SaveScreen() {
  const navigation = useNavigation();
  const route = useRoute<SaveRoute>();
  const { userId, listId, skipMode } = useAuth();
  const location = useUserLocation();

  const editId = route.params?.restaurantId ?? null;
  interface SaveFormState {
    isEditMode: boolean;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    rating: number;
    visited: boolean;
    note: string;
    photoUris: string[];
    pricePerPerson: number;
  }

  type SaveFormAction =
    | { type: 'patch'; payload: Partial<SaveFormState> }
    | { type: 'reset' };

  const initialForm: SaveFormState = {
    isEditMode: false,
    name: '',
    address: '',
    latitude: null,
    longitude: null,
    rating: 0,
    visited: true,
    note: '',
    photoUris: [],
    pricePerPerson: PRICE_DEFAULT,
  };

  function formReducer(state: SaveFormState, action: SaveFormAction): SaveFormState {
    switch (action.type) {
      case 'patch':
        return { ...state, ...action.payload };
      case 'reset':
        return initialForm;
      default:
        return state;
    }
  }

  const [form, dispatchForm] = useReducer(formReducer, initialForm);
  const [saving, setSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [gpsState, setGpsState] = useState<'idle' | 'loading' | 'filled'>('idle');

  const {
    isEditMode,
    name,
    address,
    latitude,
    longitude,
    rating,
    visited,
    note,
    photoUris,
    pricePerPerson,
  } = form;

  // One-shot read for edit mode — no listener, no re-renders on other screens
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (!editId || hasPrePopulated.current) return;
    hasPrePopulated.current = true;

    (async () => {
      try {
        let data: any = null;
        if (skipMode) {
          const locals = await getLocalRestaurants();
          data = locals.find((r) => r.id === editId);
        } else {
          const snap = await getDoc(doc(db, 'restaurants', editId));
          if (snap.exists()) {
            const d = snap.data();
            const toDate = (v: Timestamp | Date | null | undefined) => {
              if (!v) return new Date();
              if (v instanceof Date) return v;
              if (typeof (v as Timestamp).toDate === 'function') return (v as Timestamp).toDate();
              return new Date();
            };
            data = { id: snap.id, ...d, createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) };
          }
        }
        if (!data) return;
        dispatchForm({
          type: 'patch',
          payload: {
            isEditMode: true,
            name: data.name,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            rating: data.rating,
            visited: data.visited,
            note: data.note,
            photoUris: data.photoURLs?.length ? data.photoURLs : (data.photoURL ? [data.photoURL] : []),
            pricePerPerson: data.pricePerPerson ?? PRICE_DEFAULT,
          },
        });
      } catch (err) {
        console.warn('[SaveScreen] Failed to load restaurant for edit:', err);
      }
    })();
  }, [editId, skipMode]);

  const placesRef = useRef<any>(null);

  function handlePlaceSelected(data: any, details: any) {
    const nextName = data.structured_formatting?.main_text ?? data.description;
    const nextAddress = details?.formatted_address ?? data.description;
    const placeLat = details?.geometry?.location?.lat;
    const placeLng = details?.geometry?.location?.lng;
    dispatchForm({
      type: 'patch',
      payload: {
        name: nextName,
        address: nextAddress,
        ...(placeLat != null && placeLng != null
          ? { latitude: placeLat, longitude: placeLng }
          : {}),
      },
    });
  }

  async function handleGpsFill() {
    if (!location.latitude || !location.longitude) return;
    setGpsState('loading');
    try {
      const addr = await reverseGeocode(location.latitude, location.longitude);
      if (addr) {
        dispatchForm({ type: 'patch', payload: { address: addr } });
        setGpsState('filled');
      } else {
        setGpsState('idle');
      }
    } catch {
      setGpsState('idle');
    }
  }

  async function handleSave() {
    if (rating === 0) {
      Alert.alert('Rating', 'Selecciona al menos 1 estrella');
      return;
    }

    const finalName = name.trim();
    if (!finalName) {
      Alert.alert('Nombre', 'Introduce el nombre del restaurante');
      return;
    }

    setSaving(true);

    let finalLat = latitude;
    let finalLng = longitude;

    // 1) If no coords from Places selection, geocode the name/address
    if (finalLat == null || finalLng == null) {
      const queryAddress = address.trim() || finalName;
      try {
        const results = await Location.geocodeAsync(queryAddress);
        if (results.length > 0) {
          finalLat = results[0].latitude;
          finalLng = results[0].longitude;
        }
      } catch (_) {
        // geocoding failed
      }
    }

    // 2) Last resort: use GPS location if geocoding failed
    if (finalLat == null || finalLng == null) {
      if (location.latitude != null && location.longitude != null) {
        finalLat = location.latitude;
        finalLng = location.longitude;
      }
    }

    if (finalLat == null || finalLng == null) {
      setSaving(false);
      Alert.alert(
        'Ubicacion',
        'No se pudo determinar la ubicacion del restaurante. Intenta usar el buscador o introduce una direccion mas precisa.',
      );
      return;
    }
    try {
      if (skipMode) {
        const localData = {
          id: editId ?? Date.now().toString(36),
          name: finalName,
          address: address || '',
          latitude: finalLat,
          longitude: finalLng,
          rating,
          note: note.trim(),
          visited,
          pricePerPerson,
          photoURL: photoUris[0] ?? null,
          photoURLs: photoUris,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          listId: 'local',
        };
        if (isEditMode) {
          await updateLocalRestaurant(localData);
        } else {
          await saveLocalRestaurant(localData);
        }
      } else {
        await saveRestaurant({
          id: editId ?? undefined,
          name: finalName,
          address: address || '',
          latitude: finalLat,
          longitude: finalLng,
          rating,
          note: note.trim(),
          visited,
          pricePerPerson,
          photoUris,
          userId,
          listId,
        });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const canSave = rating > 0 && (name.trim().length > 0 || address.length > 0);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={60}
    >
      <SaveHeader
        title={isEditMode ? 'Editar restaurante' : 'Guardar restaurante'}
        onClose={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1 px-5 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Restaurant name */}
        <SectionLabel>Restaurante</SectionLabel>
        {!manualMode && MAPS_KEY ? (
          <View className="z-10 mb-4">
            <GooglePlacesAutocomplete
              ref={placesRef}
              placeholder="Nombre del restaurante..."
              fetchDetails
              onPress={(data, details) => {
                handlePlaceSelected(data, details);
              }}
              onFail={() => setManualMode(true)}
              query={{ key: MAPS_KEY, language: 'es' }}
              nearbyPlacesAPI="GoogleReverseGeocoding"
              currentLocation={false}
              styles={{
                textInput: {
                  borderWidth: 1,
                  borderColor: '#F0EDED',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  minHeight: 48,
                  fontSize: 16,
                  lineHeight: 24,
                  backgroundColor: '#FFFFFF',
                  color: '#2D2D2D',
                  textAlignVertical: 'center',
                },
                listView: { backgroundColor: '#FFFFFF' },
              }}
              textInputProps={{
                value: name,
                onChangeText: (text) => dispatchForm({ type: 'patch', payload: { name: text } }),
                placeholderTextColor: '#A0A0A0',
              }}
            />
          </View>
        ) : (
          <View className="mb-4">
            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Nombre del restaurante"
              placeholderTextColor="#A0A0A0"
              value={name}
              onChangeText={(text) => dispatchForm({ type: 'patch', payload: { name: text } })}
              style={{ fontSize: 16, minHeight: 48, textAlignVertical: 'center' }}
            />
          </View>
        )}

        {/* Address with GPS button */}
        <SectionLabel>Direccion</SectionLabel>
        <View style={{ position: 'relative', marginBottom: 16 }}>
          <TextInput
            className="rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
            placeholder="Direccion del restaurante"
            placeholderTextColor="#A0A0A0"
            value={address}
            onChangeText={(text) => {
              dispatchForm({ type: 'patch', payload: { address: text } });
              if (gpsState === 'filled') setGpsState('idle');
            }}
            style={{ fontSize: 16, minHeight: 48, textAlignVertical: 'center', paddingRight: 48 }}
          />
          <Pressable
            onPress={handleGpsFill}
            disabled={gpsState === 'loading' || !location.latitude}
            hitSlop={8}
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: gpsState === 'filled' ? 0 : 1.5,
              borderColor: '#D1D5DB',
              backgroundColor: gpsState === 'filled' ? '#00A699' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Rellenar direccion con GPS"
          >
            {gpsState === 'loading' ? (
              <ActivityIndicator size={14} color="#6B7280" />
            ) : (
              <Ionicons
                name="locate"
                size={16}
                color={gpsState === 'filled' ? '#FFFFFF' : '#9CA3AF'}
              />
            )}
          </Pressable>
        </View>

        {/* Rating */}
        <SectionLabel>Rating</SectionLabel>
        <View className="mb-4">
          <StarRating rating={rating} onRate={(v) => dispatchForm({ type: 'patch', payload: { rating: v } })} />
        </View>

        {/* Visited toggle */}
        <SectionLabel>Estado</SectionLabel>
        <View className="mb-4 flex-row gap-2">
          <Pressable
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-button border py-2.5 ${visited ? 'border-visited bg-visited/10' : 'border-border'}`}
            onPress={() => dispatchForm({ type: 'patch', payload: { visited: true } })}
          >
            <Ionicons
              name={visited ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={16}
              color={visited ? '#66BB6A' : '#A0A0A0'}
            />
            <Text
              className={`text-sm font-medium ${visited ? 'text-visited' : 'text-text-tertiary'}`}
            >
              Visitado
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-button border py-2.5 ${!visited ? 'border-primary bg-primary/10' : 'border-border'}`}
            onPress={() => dispatchForm({ type: 'patch', payload: { visited: false } })}
          >
            <Ionicons
              name={!visited ? 'time' : 'time-outline'}
              size={16}
              color={!visited ? '#FF5A5F' : '#B0B0B0'}
            />
            <Text
              className={`text-sm font-medium ${!visited ? 'text-primary' : 'text-text-tertiary'}`}
            >
              Pendiente
            </Text>
          </Pressable>
        </View>

        {/* Price */}
        <SectionLabel>Precio por persona</SectionLabel>
        <View className="mb-4">
          <PriceSlider value={pricePerPerson} onChange={(v) => dispatchForm({ type: 'patch', payload: { pricePerPerson: v } })} />
        </View>

        {/* Note */}
        <SectionLabel>Nota (opcional)</SectionLabel>
        <TextInput
          className="mb-4 rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
          placeholder="Ej: La pasta increible"
          placeholderTextColor="#A0A0A0"
          value={note}
          onChangeText={(text) => dispatchForm({ type: 'patch', payload: { note: text } })}
          multiline
          maxLength={200}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        {/* Photo */}
        <PhotoSection
          photoUris={photoUris}
          onPhotoAdded={(uri) => dispatchForm({ type: 'patch', payload: { photoUris: [...photoUris, uri] } })}
          onPhotoRemoved={(index) => dispatchForm({ type: 'patch', payload: { photoUris: photoUris.filter((_, i) => i !== index) } })}
        />

        {/* Save button */}
        <Pressable
          className={`mb-8 items-center rounded-button py-4 ${canSave && !saving ? 'bg-primary' : 'bg-border'}`}
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-body font-semibold text-white">
              {isEditMode ? 'Actualizar' : 'Guardar'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
