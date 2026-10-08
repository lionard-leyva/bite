import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useRestaurants } from '../hooks/useRestaurants';
import { useLocation } from '../hooks/useLocation';
import { useNavigationETA } from '../hooks/useNavigationETA';
import { useDecisionSession } from '../hooks/useDecisionSession';
import { getListMembers } from '../services/listService';
import { formatDistance, openNativeNavigation, type ETAResult } from '../services/navigationService';
import { haversineKm } from '../utils/geo';
import {
  estimateWalkMinutes,
  isRoundExhausted,
  nextUnvoted,
  rankCandidates,
  type RankedCandidate,
} from '../utils/matchLogic';
import { canPlayMatch, needsPartner } from '../utils/matchAccess';
import { getPrimaryPhoto, type Restaurant, type Vote } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import type { Colors } from '../theme/palette';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SWIPE_THRESHOLD = 110;

function useStyles() {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors]);
}

function TravelLine({ distanceKm, eta }: { distanceKm: number | null; eta: ETAResult | null }) {
  const styles = useStyles();
  if (distanceKm == null) return null;
  return (
    <View style={styles.travelRow}>
      <Text style={styles.travelText}>📍 {formatDistance(distanceKm)}</Text>
      <Text style={styles.travelText}>🚶 ~{estimateWalkMinutes(distanceKm)} min</Text>
      {eta && <Text style={styles.travelText}>🚗 {eta.durationText}</Text>}
    </View>
  );
}

interface SwipeCardProps {
  candidate: RankedCandidate;
  eta: ETAResult | null;
  onVote: (vote: Vote) => void;
}

function SwipeCard({ candidate, eta, onVote }: SwipeCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;
  const votedRef = useRef(false);
  const { restaurant, distanceKm } = candidate;
  const photo = getPrimaryPhoto(restaurant);

  const fly = (vote: Vote) => {
    if (votedRef.current) return;
    votedRef.current = true;
    Animated.timing(pan, {
      toValue: { x: (vote === 'LIKE' ? 1 : -1) * width * 1.5, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => onVote(vote));
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) fly('LIKE');
        else if (g.dx < -SWIPE_THRESHOLD) fly('PASS');
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
  });
  const likeOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.deck}>
      <Animated.View
        {...responder.panHandlers}
        style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.cardPhoto} contentFit="cover" />
        ) : (
          <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder]}>
            <Ionicons name="restaurant-outline" size={48} color={colors.primary} />
          </View>
        )}
        <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
          <Text style={[styles.stampText, { color: colors.visited }]}>IRÍA</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
          <Text style={[styles.stampText, { color: colors.danger }]}>PASO</Text>
        </Animated.View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{restaurant.name}</Text>
          {restaurant.rating > 0 && <Text style={styles.cardRating}>★ {restaurant.rating}</Text>}
          <TravelLine distanceKm={distanceKm} eta={eta} />
          {!!restaurant.note && <Text style={styles.cardNote} numberOfLines={2}>{restaurant.note}</Text>}
        </View>
      </Animated.View>

      <View style={styles.voteRow}>
        <Pressable
          style={[styles.voteButton, styles.passButton]}
          onPress={() => fly('PASS')}
          accessibilityRole="button"
          accessibilityLabel={`Paso de ${restaurant.name}`}
        >
          <Ionicons name="close" size={32} color={colors.danger} />
          <Text style={styles.voteLabel}>Paso</Text>
        </Pressable>
        <Pressable
          style={[styles.voteButton, styles.likeButton]}
          onPress={() => fly('LIKE')}
          accessibilityRole="button"
          accessibilityLabel={`Iría a ${restaurant.name}`}
        >
          <Ionicons name="heart" size={32} color={colors['on-primary']} />
          <Text style={[styles.voteLabel, { color: colors['on-primary'] }]}>Iría</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface MatchViewProps {
  restaurant: Restaurant;
  partnerName: string;
  distanceKm: number | null;
  eta: ETAResult | null;
  onShowMap: () => void;
  onRestart: () => void;
}

function MatchView({ restaurant, partnerName, distanceKm, eta, onShowMap, onRestart }: MatchViewProps) {
  const styles = useStyles();
  const scale = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scale]);

  return (
    <View style={styles.centered}>
      <Animated.Text style={[styles.matchEmoji, { transform: [{ scale }] }]}>🎉</Animated.Text>
      <Text style={styles.matchTitle}>¡Es un match!</Text>
      <Text style={styles.matchSubtitle}>Los dos queréis ir a</Text>
      <Text style={styles.matchName}>{restaurant.name}</Text>
      <Text style={styles.matchPair}>❤ Tú + {partnerName}</Text>
      <TravelLine distanceKm={distanceKm} eta={eta} />
      <Pressable style={styles.primaryButton} onPress={onShowMap} accessibilityRole="button">
        <Text style={styles.primaryButtonText}>Ver en mapa</Text>
      </Pressable>
      <Pressable
        style={styles.secondaryButton}
        onPress={() => openNativeNavigation(restaurant.latitude, restaurant.longitude, restaurant.name)}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryButtonText}>Ir ahora</Text>
      </Pressable>
      <Pressable onPress={onRestart} accessibilityRole="button" style={styles.linkButton}>
        <Text style={styles.linkText}>Nueva ronda</Text>
      </Pressable>
    </View>
  );
}

function Notice({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={48} color={colors.primary} />
      <Text style={styles.noticeTitle}>{title}</Text>
      {subtitle && <Text style={styles.noticeSubtitle}>{subtitle}</Text>}
      {action && onAction && (
        <Pressable style={styles.primaryButton} onPress={onAction} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function MatchScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user, userId, listId, skipMode } = useAuth();
  const { restaurants, loading: restaurantsLoading } = useRestaurants({ mode: 'all' });
  const location = useLocation();
  const [partnerName, setPartnerName] = useState('tu pareja');

  const canPlay = canPlayMatch({ skipMode, hasUser: !!user, listId });
  const origin = useMemo(
    () =>
      location.latitude != null && location.longitude != null
        ? { latitude: location.latitude, longitude: location.longitude }
        : null,
    [location.latitude, location.longitude],
  );

  const candidateIds = useMemo(
    () => rankCandidates(restaurants, origin).map((c) => c.restaurant.id),
    [restaurants, origin],
  );

  const { session, votes, myVotes, loading, error, vote, restart } = useDecisionSession({
    listId,
    userId,
    candidateIds,
    ready: canPlay && !restaurantsLoading && !location.loading,
  });

  useEffect(() => {
    if (!canPlay) return;
    let cancelled = false;
    getListMembers(listId)
      .then((members) => {
        const partner = members.find((m) => m.userId !== userId);
        const name = partner?.displayName || partner?.email.split('@')[0];
        if (!cancelled && name) setPartnerName(name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canPlay, listId, userId]);

  // Each partner sees the same round, ordered by their own distance.
  const deck = useMemo(() => {
    if (!session) return [];
    const ids = new Set(session.restaurantIds);
    return rankCandidates(restaurants.filter((r) => ids.has(r.id)), origin, Infinity);
  }, [session, restaurants, origin]);

  const current = nextUnvoted(deck, myVotes);
  const exhausted = session
    ? isRoundExhausted(votes, session.participants, deck.map((c) => c.restaurant.id))
    : false;

  const matchedRestaurant = session?.status === 'MATCHED'
    ? restaurants.find((r) => r.id === session.matchedRestaurantId) ?? null
    : null;
  const matched: RankedCandidate | null = matchedRestaurant
    ? {
        restaurant: matchedRestaurant,
        distanceKm: origin
          ? haversineKm(origin.latitude, origin.longitude, matchedRestaurant.latitude, matchedRestaurant.longitude)
          : null,
      }
    : null;
  const focused = matched ?? current;

  const { eta } = useNavigationETA({
    restaurantId: focused?.restaurant.id ?? null,
    destLat: focused?.restaurant.latitude ?? null,
    destLng: focused?.restaurant.longitude ?? null,
    userLat: location.latitude,
    userLng: location.longitude,
  });

  const goToProfile = () => navigation.navigate('Tabs', { screen: 'Profile' });

  let content: ReactNode;
  if (!canPlay) {
    content = (
      <Notice
        icon="people-outline"
        title="Decidid juntos"
        subtitle="Crea una cuenta y comparte tu lista para elegir dónde cenar con tu pareja."
        action="Ir a Perfil"
        onAction={goToProfile}
      />
    );
  } else if (restaurantsLoading || location.loading || (loading && !session)) {
    content = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!session) {
    content = (
      <Notice
        icon="alert-circle-outline"
        title="No se pudo empezar"
        subtitle={error ?? undefined}
        action="Reintentar"
        onAction={restart}
      />
    );
  } else if (needsPartner(session.participants)) {
    content = (
      <Notice
        icon="heart-outline"
        title="Hace falta tu pareja"
        subtitle="Comparte tu lista desde Perfil y elegid juntos sin ver lo que vota el otro."
        action="Compartir lista"
        onAction={goToProfile}
      />
    );
  } else if (matched) {
    content = (
      <MatchView
        restaurant={matched.restaurant}
        partnerName={partnerName}
        distanceKm={matched.distanceKm}
        eta={eta}
        onShowMap={() =>
          navigation.navigate('Tabs', { screen: 'Home', params: { focusRestaurantId: matched.restaurant.id } })
        }
        onRestart={restart}
      />
    );
  } else if (deck.length === 0) {
    content = (
      <Notice
        icon="bookmark-outline"
        title="No hay pendientes"
        subtitle="Guarda sitios a los que queráis ir y volved aquí para decidir."
        action="Nueva ronda"
        onAction={restart}
      />
    );
  } else if (current) {
    content = (
      <>
        <SwipeCard
          key={`${session.roundId}-${current.restaurant.id}`}
          candidate={current}
          eta={eta}
          onVote={(v) => vote(current.restaurant.id, v)}
        />
        <Text style={styles.progress}>
          {deck.indexOf(current) + 1} / {deck.length}
        </Text>
      </>
    );
  } else if (exhausted) {
    content = (
      <Notice
        icon="sad-outline"
        title="Esta vez no coincidís"
        subtitle="Probad otra ronda; quizá cambie la cosa."
        action="Empezar de nuevo"
        onAction={restart}
      />
    );
  } else {
    content = (
      <Notice
        icon="hourglass-outline"
        title={`Esperando a ${partnerName}…`}
        subtitle="Ya has votado todo. Os avisamos aquí en cuanto coincidáis."
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={18} color={colors['text-primary']} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>¿Dónde cenamos? 🍽</Text>
          {deck.length > 0 && !matched && (
            <Text style={styles.headerSubtitle}>
              {deck.length} pendiente{deck.length > 1 ? 's' : ''}{origin ? ' cerca de ti' : ''}
            </Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>
      <View style={{ flex: 1 }}>{content}</View>
    </SafeAreaView>
  );
}

function makeStyles(c: Colors) {
  // Una sola elevacion: sombra suave, sin borde.
  const float = {
    backgroundColor: c.surface,
    shadowColor: c['text-primary'],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  } as const;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { color: c['text-primary'], fontSize: 18, fontWeight: '800' },
    headerSubtitle: { color: c['text-secondary'], fontSize: 13, marginTop: 2 },
    closeButton: {
      ...float,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deck: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    card: { ...float, flex: 1, borderRadius: 20, overflow: 'hidden' },
    cardPhoto: { width: '100%', flex: 1, minHeight: 200 },
    cardPhotoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: c['primary-light'] },
    cardBody: { padding: 18, gap: 6 },
    cardTitle: { color: c['text-primary'], fontSize: 24, fontWeight: '800' },
    cardRating: { color: c['text-secondary'], fontSize: 16, fontWeight: '700' },
    cardNote: { color: c['text-secondary'], fontSize: 14 },
    travelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
    travelText: { color: c['text-primary'], fontSize: 15 },
    stamp: {
      position: 'absolute',
      top: 24,
      borderWidth: 3,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: c.surface,
    },
    stampLike: { left: 20, borderColor: c.visited, transform: [{ rotate: '-14deg' }] },
    stampPass: { right: 20, borderColor: c.danger, transform: [{ rotate: '14deg' }] },
    stampText: { fontSize: 28, fontWeight: '900' },
    voteRow: { flexDirection: 'row', justifyContent: 'center', gap: 48, paddingVertical: 20 },
    voteButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    passButton: { ...float },
    likeButton: { ...float, backgroundColor: c.primary, shadowColor: c.primary },
    voteLabel: { color: c.danger, fontSize: 11, fontWeight: '700', marginTop: 2 },
    progress: { color: c['text-secondary'], textAlign: 'center', paddingBottom: 12 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
    noticeTitle: { color: c['text-primary'], fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 8 },
    noticeSubtitle: { color: c['text-secondary'], fontSize: 15, textAlign: 'center' },
    matchEmoji: { fontSize: 64 },
    matchTitle: { color: c['text-primary'], fontSize: 30, fontWeight: '900' },
    matchSubtitle: { color: c['text-secondary'], fontSize: 15, marginTop: 8 },
    matchName: { color: c['text-primary'], fontSize: 26, fontWeight: '800', textAlign: 'center' },
    matchPair: { color: c.primary, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    primaryButton: {
      marginTop: 20,
      alignSelf: 'stretch',
      height: 52,
      borderRadius: 26,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: { color: c['on-primary'], fontSize: 16, fontWeight: '800' },
    secondaryButton: {
      ...float,
      alignSelf: 'stretch',
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: { color: c['text-primary'], fontSize: 16, fontWeight: '700' },
    linkButton: { paddingVertical: 12 },
    linkText: { color: c['text-secondary'], fontSize: 14, textDecorationLine: 'underline' },
  });
}
