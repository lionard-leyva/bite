import type { ReactNode } from 'react';
import { useFonts } from 'expo-font';
import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';

// Young Serif para los titulos (font-display) y Figtree para el resto (font-sans*). Mientras cargan no se dibuja nada (evita el parpadeo
// de otra letra); si la carga falla, la app sigue con la fuente del sistema.
export default function FontGate({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts({
    YoungSerif_400Regular,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  if (!loaded && !error) return null;
  return <>{children}</>;
}
