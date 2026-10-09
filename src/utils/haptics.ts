import * as Haptics from 'expo-haptics';

// Toques tactiles. Un fallo (movil sin motor, simulador) nunca debe romper la accion que los dispara.
const safe = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};

export const tapLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const tapMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const tapSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
