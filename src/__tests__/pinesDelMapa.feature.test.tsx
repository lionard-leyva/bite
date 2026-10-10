// Acceptance: features/pines-del-mapa.feature (PIN-01, PIN-02 del plan E2E). MapMarker real renderizado fuera del mapa.
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import MapMarker from '../components/MapMarker';
import { palette } from '../theme/palette';

const feature = loadFeature('features/pines-del-mapa.feature');
const c = palette.light;

defineFeature(feature, (test) => {
  test('La píldora cuenta el estado', ({ given, when, then, and }) => {
    let visited = false;
    let pantalla: ReturnType<typeof render>;
    given(/^un restaurante (pendiente|visitado)$/, (estado: string) => {
      visited = estado === 'visitado';
    });
    when('se dibuja su pin en el mapa', () => {
      pantalla = render(<MapMarker name="Casa Lucio" visited={visited} isSelected={false} />);
    });
    then(/^el pin muestra "(.*)" sobre fondo (.*)$/, (marca: string, fondo: string) => {
      expect(pantalla.getByText(marca)).toBeTruthy();
      const pildora = StyleSheet.flatten(pantalla.getByTestId('pin').props.style);
      if (fondo === 'terracota') {
        expect(pildora.backgroundColor).toBe(c.primary);
      } else {
        expect(pildora.backgroundColor).toBe(c.surface);
        expect(pildora.borderColor).toBe(c.visited);
      }
    });
    and('no enseña el nombre', () => {
      expect(pantalla.queryByText('Casa Lucio')).toBeNull();
    });
  });

  test('El pin elegido enseña el nombre', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given('un restaurante pendiente llamado "Casa Lucio"', () => {});
    when('se dibuja su pin elegido en el mapa', () => {
      pantalla = render(<MapMarker name="Casa Lucio" visited={false} isSelected />);
    });
    then('el pin muestra "Casa Lucio" junto a "🍽"', () => {
      expect(pantalla.getByText('Casa Lucio')).toBeTruthy();
      expect(pantalla.getByText('🍽')).toBeTruthy();
    });
  });
});
