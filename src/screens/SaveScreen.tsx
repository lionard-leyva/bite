import { useState, useRef, useEffect } from 'react';
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

export default function SaveScreen() {
  const navigation = useNavigation();
  const route = useRoute<SaveRoute>();
  const { userId, listId, skipMode } = useAuth();
  const location = useUserLocation();

  const editId = route.params?.restaurantId ?? null;
  const [isEditMode, setIsEditMode] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [visited, setVisited] = useState(true);
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pricePerPerson, setPricePerPerson] = useState(PRICE_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);

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
        setIsEditMode(true);
        setName(data.name);
        setAddress(data.address);
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        setRating(data.rating);
        setVisited(data.visited);
        setNote(data.note);
        setPhotoUri(data.photoURL);
        setPricePerPerson(data.pricePerPerson ?? PRICE_DEFAULT);
      } catch (err) {
        console.warn('[SaveScreen] Failed to load restaurant for edit:', err);
      }
    })();
  }, [editId, skipMode]);

  const placesRef = useRef<any>(null);

  // Auto-fill GPS coords and address when location becomes available (non-edit mode)
  const hasAutoFilledGPS = useRef(!!editId);
  useEffect(() => {
    if (hasAutoFilledGPS.current) return;
    if (location.latitude == null || location.longitude == null) return;
    hasAutoFilledGPS.current = true;
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    if (location.address) {
      setAddress(location.address);
    }
  }, [location.latitude, location.longitude, location.address]);

  function handlePlaceSelected(data: any, details: any) {
    setName(data.structured_formatting?.main_text ?? data.description);
    setAddress(details?.formatted_address ?? data.description);
    const placeLat = details?.geometry?.location?.lat;
    const placeLng = details?.geometry?.location?.lng;
    if (placeLat != null && placeLng != null) {
      setLatitude(placeLat);
      setLongitude(placeLng);
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

    // If no coords yet (manual mode), geocode the address
    if (finalLat == null || finalLng == null) {
      const queryAddress = address.trim() || finalName;
      try {
        const results = await Location.geocodeAsync(queryAddress);
        if (results.length > 0) {
          finalLat = results[0].latitude;
          finalLng = results[0].longitude;
        }
      } catch (_) {
        // geocoding failed — fall through to error below
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
          photoURL: photoUri,
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
          photoUri,
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
      {/* Custom modal header */}
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
          onPress={() => navigation.goBack()}
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
          {isEditMode ? 'Editar restaurante' : 'Guardar restaurante'}
        </Text>
        {/* Invisible spacer to keep title centered */}
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Location box */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Ubicacion
        </Text>

        {/* GPS address indicator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: address ? '#00A699' : '#F0EDED',
            borderRadius: 12,
            paddingHorizontal: 12,
            minHeight: 48,
            backgroundColor: address ? '#F0FDFA' : '#FFFFFF',
            marginBottom: 8,
          }}
        >
          {location.loading ? (
            <ActivityIndicator size={16} color="#FF5A5F" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons
              name={address ? 'locate' : 'locate-outline'}
              size={18}
              color={address ? '#00A699' : '#FF5A5F'}
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 15,
              color: location.loading ? '#6B7280' : '#1F2937',
            }}
          >
            {location.loading
              ? 'Tu ubicaci\u00F3n...'
              : address || 'Ubicaci\u00F3n no disponible'}
          </Text>
        </View>

        {/* Restaurant name */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Nombre
        </Text>
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
                onChangeText: setName,
                placeholderTextColor: '#A0A0A0',
              }}
            />
          </View>
        ) : (
          <View className="mb-4 gap-2">
            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-body text-text-primary"
              placeholder="Nombre del restaurante"
              placeholderTextColor="#A0A0A0"
              value={name}
              onChangeText={setName}
              style={{ minHeight: 48, textAlignVertical: 'center' }}
            />
            <TextInput
              className="rounded-input border border-border bg-surface px-4 py-3 text-body text-text-primary"
              placeholder="Direccion del restaurante"
              placeholderTextColor="#A0A0A0"
              value={address}
              onChangeText={setAddress}
              style={{ minHeight: 48, textAlignVertical: 'center' }}
            />
          </View>
        )}

        {/* Rating */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Rating
        </Text>
        <View className="mb-4">
          <StarRating rating={rating} onRate={setRating} />
        </View>

        {/* Visited toggle */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Estado
        </Text>
        <View className="mb-4 flex-row gap-2">
          <Pressable
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-button border py-2.5 ${visited ? 'border-visited bg-visited/10' : 'border-border'}`}
            onPress={() => setVisited(true)}
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
            onPress={() => setVisited(false)}
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
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Precio por persona
        </Text>
        <View className="mb-4">
          <PriceSlider value={pricePerPerson} onChange={setPricePerPerson} />
        </View>

        {/* Note */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Nota (opcional)
        </Text>
        <TextInput
          className="mb-4 rounded-input border border-border bg-surface px-4 py-3 text-body text-text-primary"
          placeholder="Ej: La pasta increible"
          placeholderTextColor="#A0A0A0"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={200}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        {/* Photo */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Foto (opcional)
        </Text>
        <View className="mb-6">
          <PhotoPicker
            photoUri={photoUri}
            onPhotoPicked={setPhotoUri}
            onPhotoRemoved={() => setPhotoUri(null)}
          />
        </View>

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
