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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useUserLocation } from '../hooks/useLocation';
import { saveRestaurant } from '../services/restaurantService';
import { saveLocalRestaurant } from '../services/localStorageService';
import StarRating from '../components/StarRating';
import PhotoPicker from '../components/PhotoPicker';

const MAPS_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

export default function SaveScreen() {
  const navigation = useNavigation();
  const { userId, listId, skipMode } = useAuth();
  const location = useUserLocation();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [visited, setVisited] = useState(true);
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const placesRef = useRef<any>(null);

  // Auto-fill address hint from GPS (display only — NOT used as restaurant coords)
  const hasAutoFilled = useRef(false);
  useEffect(() => {
    if (location.address && !hasAutoFilled.current && !name) {
      hasAutoFilled.current = true;
      // Only set address text for display; lat/lng must come from Places API or geocoding
    }
  }, [location.address]);

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
        await saveLocalRestaurant({
          id: Date.now().toString(36),
          name: finalName,
          address: address || '',
          latitude: finalLat,
          longitude: finalLng,
          rating,
          note: note.trim(),
          visited,
          photoURL: photoUri,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          listId: 'local',
        });
      } else {
        await saveRestaurant({
          name: finalName,
          address: address || '',
          latitude: finalLat,
          longitude: finalLng,
          rating,
          note: note.trim(),
          visited,
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
      keyboardVerticalOffset={90}
    >
      <ScrollView
        className="flex-1 px-5 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Location section */}
        <Text className="mb-1 text-label font-medium uppercase tracking-wider text-text-tertiary">
          Ubicacion
        </Text>

        {location.loading ? (
          <View className="mb-4 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#FF5A5F" />
            <Text className="text-sm text-text-secondary">Detectando ubicacion...</Text>
          </View>
        ) : null}

        {!manualMode && MAPS_KEY ? (
          <View className="z-10 mb-4">
            <GooglePlacesAutocomplete
              ref={placesRef}
              placeholder="Buscar restaurante..."
              fetchDetails
              onPress={handlePlaceSelected}
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
            {!MAPS_KEY && !manualMode ? (
              <Text className="mb-1 text-caption text-warning">
                Busqueda no disponible. Introduce el nombre manualmente.
              </Text>
            ) : (
              <Text className="mb-1 text-caption text-warning">
                No pudimos buscar restaurantes. Introduce el nombre manualmente.
              </Text>
            )}
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

        {location.address && !name ? (
          <Text className="mb-4 text-sm text-text-secondary">
            Cerca de: {location.address}
          </Text>
        ) : null}

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
              Guardar
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
