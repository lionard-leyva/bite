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
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import { saveRestaurant } from '../services/restaurantService';
import { saveLocalRestaurant } from '../services/localStorageService';
import StarRating from '../components/StarRating';
import PhotoPicker from '../components/PhotoPicker';

const MAPS_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY ?? '';

export default function SaveScreen() {
  const navigation = useNavigation();
  const { userId, listId, skipMode } = useAuth();
  const location = useLocation();

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

  // Auto-fill address from GPS when location loads
  const hasAutoFilled = useRef(false);
  useEffect(() => {
    if (location.address && !hasAutoFilled.current && !name) {
      hasAutoFilled.current = true;
      setAddress(location.address);
      setLatitude(location.latitude);
      setLongitude(location.longitude);
    }
  }, [location.address]);

  function handlePlaceSelected(data: any, details: any) {
    setName(data.structured_formatting?.main_text ?? data.description);
    setAddress(details?.formatted_address ?? data.description);
    setLatitude(details?.geometry?.location?.lat ?? location.latitude);
    setLongitude(details?.geometry?.location?.lng ?? location.longitude);
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

    const finalLat = latitude ?? location.latitude;
    const finalLng = longitude ?? location.longitude;

    if (finalLat == null || finalLng == null) {
      Alert.alert('Ubicacion', 'No se pudo determinar la ubicacion');
      return;
    }

    setSaving(true);
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
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        {/* Location section */}
        <Text className="mb-1 text-xs font-medium uppercase text-gray-400">
          Ubicacion
        </Text>

        {location.loading ? (
          <View className="mb-4 flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <Text className="text-sm text-gray-500">Detectando ubicacion...</Text>
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
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  height: 44,
                  fontSize: 16,
                },
                listView: { backgroundColor: 'white' },
              }}
              textInputProps={{
                value: name,
                onChangeText: setName,
              }}
            />
          </View>
        ) : (
          <View className="mb-4 gap-2">
            {!MAPS_KEY && !manualMode ? (
              <Text className="mb-1 text-xs text-amber-600">
                Busqueda no disponible. Introduce el nombre manualmente.
              </Text>
            ) : (
              <Text className="mb-1 text-xs text-amber-600">
                No pudimos buscar restaurantes. Introduce el nombre manualmente.
              </Text>
            )}
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              placeholder="Nombre del restaurante"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              placeholder="Direccion (opcional)"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        )}

        {location.address && !name ? (
          <Text className="mb-4 text-sm text-gray-500">
            Cerca de: {location.address}
          </Text>
        ) : null}

        {/* Rating */}
        <Text className="mb-1 text-xs font-medium uppercase text-gray-400">
          Rating
        </Text>
        <View className="mb-4">
          <StarRating rating={rating} onRate={setRating} />
        </View>

        {/* Visited toggle */}
        <Text className="mb-1 text-xs font-medium uppercase text-gray-400">
          Estado
        </Text>
        <View className="mb-4 flex-row gap-2">
          <Pressable
            className={`flex-1 items-center rounded-lg border py-2.5 ${visited ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
            onPress={() => setVisited(true)}
          >
            <Text
              className={`text-sm font-medium ${visited ? 'text-green-700' : 'text-gray-500'}`}
            >
              Visitado
            </Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-lg border py-2.5 ${!visited ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            onPress={() => setVisited(false)}
          >
            <Text
              className={`text-sm font-medium ${!visited ? 'text-blue-700' : 'text-gray-500'}`}
            >
              Pendiente
            </Text>
          </Pressable>
        </View>

        {/* Note */}
        <Text className="mb-1 text-xs font-medium uppercase text-gray-400">
          Nota (opcional)
        </Text>
        <TextInput
          className="mb-4 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          placeholder="Ej: La pasta increible"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={200}
        />

        {/* Photo */}
        <Text className="mb-1 text-xs font-medium uppercase text-gray-400">
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
          className={`mb-8 items-center rounded-xl py-4 ${canSave && !saving ? 'bg-red-500' : 'bg-gray-300'}`}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Guardar
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
