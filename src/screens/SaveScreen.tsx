import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useLocation as useUserLocation } from '../hooks/useLocation';
import { reverseGeocode } from '../services/locationService';
import { resolveSharedText } from '../services/shareService';
import { searchPlaces, searchAddresses, placeDetails, newSessionToken, type PlaceSuggestion } from '../services/placesService';
import { parseSharedText, sourceLabel, cleanUrl, type ShareSource } from '../utils/shareParser';
import { shouldSearch, saveBlocker, farAwayKm, formatKm, type LatLng } from '../utils/saveRules';
import { saveRestaurant } from '../services/restaurantService';
import { saveLocalRestaurant, updateLocalRestaurant, getLocalRestaurants } from '../services/localStorageService';
import type { RootStackParamList } from '../navigation/types';
import StarRating from '../components/StarRating';
import PriceChips from '../components/PriceChips';
import PhotoPicker from '../components/PhotoPicker';
import DragHandle from '../components/DragHandle';
import MiniMap from '../components/MiniMap';
import { PRICE_DEFAULT, PLACES_API_DEBOUNCE_MS } from '../config/constants';
import KeyboardForm from '../components/KeyboardForm';
import { useTheme } from '../theme/ThemeProvider';
import { withAlpha } from '../theme/color';
import { friendlyMessage } from '../utils/userError';

type SaveRoute = RouteProp<RootStackParamList, 'Save'>;

const SEARCH_DOWN = 'Ahora no podemos buscar sitios. Escribe el nombre y marca dónde está.';
// Sin ubicacion de Ana, "Marcar en el mapa" empieza en la Puerta del Sol y se arrastra desde ahi.
const DEFAULT_CENTER: LatLng = { latitude: 40.4168, longitude: -3.7038 };

function SectionLabel({ children, required = false }: { children: string; required?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text className="mb-2 text-label font-sans-bold uppercase tracking-wider text-text-tertiary">
      {children}
      {required && <Text style={{ color: colors.primary }}> obligatorio</Text>}
    </Text>
  );
}

function SaveHeader({ title, onClose }: { title: string; onClose: () => void }) {
  // El modal de Android dibuja bajo la barra de estado (edge-to-edge): sin esto la X queda sobre el reloj.
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
      <DragHandle />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onClose}
          hitSlop={8}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="close" size={20} color={colors['text-primary']} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 24, fontFamily: 'YoungSerif_400Regular', color: colors['text-primary'] }}>{title}</Text>
      </View>
    </View>
  );
}

type ShareBanner = { loading: boolean; source: ShareSource; located: boolean; hasName: boolean };

function SharedFromBanner({ banner }: { banner: ShareBanner }) {
  const { colors } = useTheme();
  const from = sourceLabel(banner.source);
  const message = banner.loading
    ? `Leyendo enlace de ${from}...`
    : banner.located
      ? `Desde ${from}. Revisa los datos y guarda.`
      : banner.hasName
        ? `Desde ${from}. Comprueba el nombre y eligelo en el buscador.`
        : `Desde ${from}. Busca el restaurante para guardarlo.`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors['primary-light'],
      }}
      accessibilityLiveRegion="polite"
    >
      {banner.loading ? (
        <ActivityIndicator size={14} color={colors.primary} />
      ) : (
        <Ionicons name="share-social" size={16} color={colors.primary} />
      )}
      <Text style={{ flex: 1, fontSize: 13, color: colors['text-secondary'] }}>{message}</Text>
    </View>
  );
}

function Notice({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors['text-primary'] }}>{text}</Text>
        {action && (
          <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 14, color: colors.primary }}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SuggestionList({
  items,
  onPick,
  footer,
}: {
  items: PlaceSuggestion[];
  onPick: (s: PlaceSuggestion) => void;
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();
  if (items.length === 0 && !footer) return null;
  return (
    <View style={{ marginTop: 8, padding: 6, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      {items.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => onPick(s)}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: pressed ? colors['primary-light'] : 'transparent' })}
        >
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 15, color: colors['text-primary'] }}>{s.name}</Text>
            {!!s.secondary && (
              <Text style={{ fontSize: 13, color: colors['text-secondary'] }}>
                {s.distanceMeters != null ? `${s.secondary} · ${formatKm(s.distanceMeters / 1000)}` : s.secondary}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
      {footer}
    </View>
  );
}

function ChoiceButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{ flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
    >
      <Ionicons name={icon} size={16} color={colors['text-primary']} />
      <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 14, color: colors['text-primary'] }}>{label}</Text>
    </Pressable>
  );
}

function StatusButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ flex: 1, minHeight: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors['text-primary'] : colors.surface, borderWidth: selected ? 0 : 1, borderColor: colors.border }}
    >
      <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 15, color: selected ? colors.surface : colors['text-primary'] }}>{label}</Text>
    </Pressable>
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
        <PhotoPicker photoUris={photoUris} onPhotoAdded={onPhotoAdded} onPhotoRemoved={onPhotoRemoved} />
      </View>
    </>
  );
}

// Dos pasos: buscar el sitio (se rellena solo) o anadirlo a mano marcando donde esta. Nunca se adivina la ubicacion.
export default function SaveScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<SaveRoute>();
  const { userId, listId, skipMode } = useAuth();
  const userLocation = useUserLocation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const noteRef = useRef<TextInput>(null);

  const editId = route.params?.restaurantId ?? null;
  const sharedText = route.params?.sharedText ?? null;
  const [shareBanner, setShareBanner] = useState<ShareBanner | null>(null);

  const [step, setStep] = useState<'search' | 'form'>(editId ? 'form' : 'search');
  // picked: el sitio salio del buscador (nombre, direccion y coordenadas de Google); si no, se marca a mano.
  const [picked, setPicked] = useState(false);
  const [searchDown, setSearchDown] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [addressTyped, setAddressTyped] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const sessionRef = useRef(newSessionToken());

  const [isEditMode, setIsEditMode] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [pinToConfirm, setPinToConfirm] = useState(false);
  const [rating, setRating] = useState(0);
  const [visited, setVisited] = useState(false);
  const [note, setNote] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [pricePerPerson, setPricePerPerson] = useState<number>(PRICE_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [farAway, setFarAway] = useState<number | null>(null);

  const near: LatLng | null =
    userLocation.latitude != null && userLocation.longitude != null
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : null;

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
          if (snap?.exists()) {
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
        setName(data.name ?? '');
        setAddress(data.address ?? '');
        if (data.latitude != null && data.longitude != null) setLocation({ latitude: data.latitude, longitude: data.longitude });
        setRating(data.rating ?? 0);
        setVisited(!!data.visited);
        setNote(data.note ?? '');
        setPhotoUris(data.photoURLs?.length ? data.photoURLs : data.photoURL ? [data.photoURL] : []);
        setPricePerPerson(data.pricePerPerson ?? PRICE_DEFAULT);
      } catch (err) {
        console.warn('[SaveScreen] Failed to load restaurant for edit:', err);
      }
    })();
  }, [editId, skipMode]);

  // Shared from another app: prefill as a pending restaurant for the user to confirm
  useEffect(() => {
    if (!sharedText || editId) return;
    let cancelled = false;
    const source = parseSharedText(sharedText)?.source ?? 'other';
    setShareBanner({ loading: true, source, located: false, hasName: false });

    (async () => {
      const parsed = await resolveSharedText(sharedText);
      if (cancelled) return;
      if (!parsed) {
        setShareBanner(null);
        return;
      }
      const { latitude: lat, longitude: lng } = parsed;
      const located = lat != null && lng != null;
      let addr = '';
      if (located) {
        try {
          addr = (await reverseGeocode(lat, lng)) ?? '';
        } catch {
          // address stays empty, coords are enough to save
        }
        if (cancelled) return;
      }
      const fromSocial = parsed.source === 'instagram' || parsed.source === 'tiktok';
      setName(parsed.name ?? '');
      setAddress(addr);
      setLocation(located ? { latitude: lat, longitude: lng } : null);
      setVisited(false);
      setNote(fromSocial && parsed.url ? `Visto en ${sourceLabel(parsed.source)}: ${cleanUrl(parsed.url)}`.slice(0, 200) : '');
      setPicked(false);
      // With the Maps pin we already have the place; otherwise confirm it in the search
      setStep(located ? 'form' : 'search');
      setShareBanner({ loading: false, source: parsed.source, located, hasName: !!parsed.name });
    })();

    return () => {
      cancelled = true;
    };
  }, [sharedText, editId]);

  // Buscador de sitios: desde 3 letras, cerca de Ana, esperando a que deje de escribir.
  useEffect(() => {
    if (step !== 'search' || !shouldSearch(name)) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(name.trim(), near, sessionRef.current);
        if (!cancelled) setSuggestions(found);
      } catch (err) {
        if (cancelled) return;
        console.warn('[SaveScreen] Place search failed:', err);
        goManual(true);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, PLACES_API_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // near cambia de objeto en cada render: se compara por coordenadas
  }, [step, name, near?.latitude, near?.longitude]);

  // Direcciones que existen, mientras Ana escribe la direccion a mano
  useEffect(() => {
    if (step !== 'form' || picked || !addressTyped || !shouldSearch(address)) {
      setAddressSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const found = await searchAddresses(address.trim(), near, sessionRef.current);
        if (!cancelled) setAddressSuggestions(found);
      } catch (err) {
        // Sin sugerencias de direccion quedan "Usar mi ubicacion" y "Marcar en el mapa"
        if (!cancelled) setAddressSuggestions([]);
        console.warn('[SaveScreen] Address search failed:', err);
      }
    }, PLACES_API_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, picked, addressTyped, address, near?.latitude, near?.longitude]);

  function goManual(becauseSearchIsDown = false) {
    setStep('form');
    setPicked(false);
    setSuggestions([]);
    if (becauseSearchIsDown) {
      setSearchDown(true);
      // Sin buscador el pin empieza donde esta Ana, para arrastrarlo al sitio
      if (near) setLocation((current) => current ?? near);
    }
  }

  function backToSearch() {
    setPicked(false);
    setLocation(null);
    setPinToConfirm(false);
    setAddress('');
    setCity(undefined);
    setStep('search');
  }

  // Un fallo puntual (red, tiempo) no deja a Ana sin buscador para siempre
  function retrySearch() {
    setSearchDown(false);
    backToSearch();
  }

  async function pickPlace(s: PlaceSuggestion) {
    try {
      const d = await placeDetails(s.id, sessionRef.current);
      setName(d.name || s.name);
      setAddress(d.address || s.secondary);
      setCity(d.city);
      setLocation({ latitude: d.latitude, longitude: d.longitude });
      setPinToConfirm(false);
      setPicked(true);
      setStep('form');
    } catch (err) {
      console.warn('[SaveScreen] Place details failed:', err);
      setName(s.name);
      goManual(true);
    } finally {
      sessionRef.current = newSessionToken();
    }
  }

  async function pickAddress(s: PlaceSuggestion) {
    setAddressTyped(false);
    setAddressSuggestions([]);
    try {
      const d = await placeDetails(s.id, sessionRef.current);
      setAddress(d.address || s.name);
      setCity(d.city);
      setLocation({ latitude: d.latitude, longitude: d.longitude });
      setPinToConfirm(false);
      setLocationHint('');
    } catch (err) {
      console.warn('[SaveScreen] Address details failed:', err);
      setLocationHint('No pudimos ubicar esa dirección. Usa tu ubicación o márcalo en el mapa.');
    } finally {
      sessionRef.current = newSessionToken();
    }
  }

  async function useMyLocation() {
    const coords = (await userLocation.refresh()) ?? near;
    if (!coords) {
      setLocationHint('No sabemos dónde estás. Márcalo en el mapa.');
      return;
    }
    setLocationHint('');
    await placePin({ latitude: coords.latitude, longitude: coords.longitude });
  }

  // La direccion siempre es la del pin: al moverlo se pide la del nuevo punto (o se vacia si no hay).
  async function placePin(next: LatLng) {
    setLocation(next);
    setPinToConfirm(false);
    setCity(undefined);
    let addr: string | null = null;
    try {
      addr = await reverseGeocode(next.latitude, next.longitude);
    } catch {
      // the pin is enough to save
    }
    setAddress(addr ?? '');
  }

  function markOnMap() {
    setLocationHint('');
    if (location) return;
    if (near) {
      void placePin(near);
      return;
    }
    // Sin saber donde esta Ana, el pin sale en un punto por defecto y hay que llevarlo al sitio antes de guardar
    setLocation(DEFAULT_CENTER);
    setPinToConfirm(true);
    setCity(undefined);
  }

  function movePin(next: LatLng) {
    void placePin(next);
  }

  const blocker = saveBlocker({ name, location, rating, pinToConfirm });

  async function handleSave(confirmedFar = false) {
    if (blocker || !location) return;
    if (!confirmedFar) {
      const km = farAwayKm(location, near);
      if (km != null) {
        setFarAway(km);
        return;
      }
    }
    setFarAway(null);
    setSaving(true);
    const finalName = name.trim();
    try {
      if (skipMode) {
        const localData = {
          id: editId ?? Date.now().toString(36),
          name: finalName,
          address: address.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
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
          address: address.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
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
    } catch (e: unknown) {
      Alert.alert('No se pudo guardar', friendlyMessage(e, 'Inténtalo de nuevo en un momento.'));
    } finally {
      setSaving(false);
    }
  }

  function changeLocationAfterWarning() {
    setFarAway(null);
    // El sitio elegido pasa a editarse a mano: el pin se puede arrastrar o elegir otra direccion
    setPicked(false);
  }

  const title = isEditMode ? 'Editar restaurante' : 'Guardar restaurante';
  const farTitle = farAway != null ? `Este sitio está ${city ? `en ${city}, ` : ''}a ${formatKm(farAway)} de ti` : '';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={60}
    >
      <SaveHeader title={title} onClose={() => navigation.goBack()} />

      <KeyboardForm
        avoid={false}
        scrollRef={scrollRef}
        scrollClassName="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 + insets.bottom }}
      >
        {shareBanner && <SharedFromBanner banner={shareBanner} />}

        {step === 'search' ? (
          <View>
            <SectionLabel>Busca el restaurante</SectionLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 14, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
              <Ionicons name="search" size={18} color={colors['text-secondary']} />
              <TextInput
                style={{ flex: 1, fontSize: 17, lineHeight: 24, minHeight: 48, color: colors['text-primary'], textAlignVertical: 'center' }}
                placeholder="Nombre del restaurante"
                placeholderTextColor={colors['text-tertiary']}
                maxLength={120}
                value={name}
                onChangeText={setName}
                autoFocus={!sharedText}
                returnKeyType="search"
                accessibilityLabel="Busca el restaurante"
              />
              {searching && <ActivityIndicator testID="buscando" size="small" color={colors['text-secondary']} />}
            </View>
            <SuggestionList
              items={suggestions}
              onPick={pickPlace}
              footer={
                <Pressable
                  onPress={() => goManual()}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: suggestions.length ? 1 : 0, borderColor: colors.border }}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 15, color: colors.primary }}>¿No aparece? Añádelo a mano</Text>
                </Pressable>
              }
            />
            <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: colors['text-secondary'] }}>
              Sugerencias cerca de ti desde 3 letras. Elige una y se rellenan solos el nombre, la dirección y el sitio en el mapa.
            </Text>
          </View>
        ) : (
          <View>
            {searchDown && <Notice text={SEARCH_DOWN} action={{ label: 'Volver a buscar', onPress: retrySearch }} />}

            {picked && location ? (
              <View style={{ marginBottom: 16, padding: 8, borderRadius: 18, backgroundColor: colors.surface }}>
                <MiniMap location={location} label={name} height={150} />
                <View style={{ paddingHorizontal: 6, paddingTop: 8, paddingBottom: 4, gap: 4 }}>
                  <Text style={{ fontFamily: 'YoungSerif_400Regular', fontSize: 22, color: colors['text-primary'] }}>{name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="location-outline" size={16} color={colors.visited} />
                    <Text style={{ flex: 1, fontSize: 14, color: colors['text-secondary'] }}>{address}</Text>
                    <Pressable onPress={backToSearch} accessibilityRole="button" accessibilityLabel="Cambiar el sitio" hitSlop={8}>
                      <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 14, color: colors.primary }}>Cambiar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <SectionLabel>Nombre</SectionLabel>
                <TextInput
                  className="mb-4 rounded-input border border-border bg-surface px-4 text-text-primary"
                  placeholder="Nombre del restaurante"
                  maxLength={120}
                  placeholderTextColor={colors['text-tertiary']}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  style={{ fontSize: 17, lineHeight: 24, minHeight: 52, textAlignVertical: 'center' }}
                />

                <SectionLabel required>¿Dónde está?</SectionLabel>
                <TextInput
                  className="rounded-input border border-border bg-surface px-4 text-text-primary"
                  placeholder="Direccion del restaurante"
                  maxLength={200}
                  placeholderTextColor={colors['text-tertiary']}
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    setAddressTyped(true);
                  }}
                  returnKeyType="next"
                  style={{ fontSize: 17, lineHeight: 24, minHeight: 52, textAlignVertical: 'center' }}
                />
                <SuggestionList items={addressSuggestions} onPick={pickAddress} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 }}>
                  <ChoiceButton label="Usar mi ubicación" icon="locate" onPress={useMyLocation} />
                  <ChoiceButton label="Marcar en el mapa" icon="map-outline" onPress={markOnMap} />
                </View>
                {!!locationHint && <Text style={{ marginBottom: 8, fontSize: 13, color: colors['text-secondary'] }}>{locationHint}</Text>}
                {location ? (
                  <MiniMap
                    location={location}
                    label={name.trim() || 'Arrástrame'}
                    draggable
                    onMove={movePin}
                    caption="Arrastra el pin hasta el sitio"
                  />
                ) : (
                  <View style={{ height: 150, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                    <Text style={{ textAlign: 'center', fontSize: 14, color: colors['text-secondary'] }}>
                      Elige una dirección, tu ubicación o toca el mapa: aquí verás el pin antes de guardar
                    </Text>
                  </View>
                )}
              </View>
            )}

            <SectionLabel>Valoración</SectionLabel>
            <View className="mb-4">
              <StarRating rating={rating} onRate={setRating} />
            </View>

            <SectionLabel>Estado</SectionLabel>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <StatusButton label="Pendiente" selected={!visited} onPress={() => setVisited(false)} />
              <StatusButton label="Visitado" selected={visited} onPress={() => setVisited(true)} />
            </View>

            <SectionLabel>Precio por persona</SectionLabel>
            <View className="mb-4">
              <PriceChips value={pricePerPerson} onChange={setPricePerPerson} />
            </View>

            <SectionLabel>Nota (opcional)</SectionLabel>
            <TextInput
              ref={noteRef}
              className="mb-4 rounded-input border border-border bg-surface px-4 py-3 text-text-primary"
              placeholder="Ej: La pasta increible"
              placeholderTextColor={colors['text-tertiary']}
              value={note}
              onChangeText={setNote}
              multiline
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
              maxLength={200}
              returnKeyType="done"
              blurOnSubmit
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />

            <PhotoSection
              photoUris={photoUris}
              onPhotoAdded={(uri) => setPhotoUris((list) => [...list, uri])}
              onPhotoRemoved={(index) => setPhotoUris((list) => list.filter((_, i) => i !== index))}
            />

            {!!blocker && (
              <Text accessibilityLiveRegion="polite" style={{ marginBottom: 8, textAlign: 'center', fontSize: 13, color: colors['text-secondary'] }}>
                {blocker}
              </Text>
            )}
            <Pressable
              className={`mb-8 items-center rounded-button py-4 ${!blocker && !saving ? 'bg-primary' : 'bg-border'}`}
              onPress={() => handleSave()}
              disabled={!!blocker || saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!blocker || saving }}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color={colors['text-secondary']} />
              ) : (
                <Text className={`text-body font-sans-semibold ${!blocker ? 'text-on-primary' : 'text-text-secondary'}`}>
                  {isEditMode ? 'Actualizar' : 'Guardar'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardForm>

      <Modal visible={farAway != null} transparent animationType="slide" onRequestClose={changeLocationAfterWarning}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: withAlpha(colors['text-primary'], 0.45) }}>
          <View
            accessibilityViewIsModal
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 + insets.bottom, gap: 14 }}
          >
            {location && <MiniMap location={location} label={name} height={150} />}
            <Text style={{ fontFamily: 'YoungSerif_400Regular', fontSize: 22, lineHeight: 28, color: colors['text-primary'] }}>{farTitle}</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: colors['text-secondary'] }}>
              ¿Es correcto? Si no, cambia la dirección o mueve el pin antes de guardar.
            </Text>
            <Pressable
              onPress={changeLocationAfterWarning}
              accessibilityRole="button"
              style={{ minHeight: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 16, color: colors['on-primary'] }}>Cambiar ubicación</Text>
            </Pressable>
            <Pressable
              onPress={() => handleSave(true)}
              accessibilityRole="button"
              style={{ minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Figtree_700Bold', fontSize: 16, color: colors['text-primary'] }}>
                {city ? `Sí, está en ${city}` : 'Sí, guardar aquí'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
