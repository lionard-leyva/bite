import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// true cuando el sistema pide "reducir movimiento" (Android: quitar animaciones). Sigue los cambios en vivo.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => vivo && setReduced(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
