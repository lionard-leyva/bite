// Acceptance: features/pines-del-mapa.feature (PIN-01, PIN-02 del plan E2E). MapMarker real renderizado fuera del mapa.
import { render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import MapMarker from '../components/MapMarker';

const feature = loadFeature('features/pines-del-mapa.feature');

defineFeature(feature, (test) => {
  test('La píldora cuenta el estado y la valoración', ({ given, when, then, and }) => {
    let visited = false;
    let rating = 0;
    let pantalla: ReturnType<typeof render>;
    given(/^un restaurante (pendiente|visitado) con (\d) estrellas$/, (estado: string, r: string) => {
      visited = estado === 'visitado';
      rating = Number(r);
    });
    when('se dibuja su pin en el mapa', () => {
      pantalla = render(<MapMarker name="Casa Lucio" visited={visited} rating={rating} isSelected={false} />);
    });
    then(/^el pin muestra "(.*)" y "(\d)"$/, (emoji: string, estrellas: string) => {
      expect(pantalla.getByText(emoji)).toBeTruthy();
      expect(pantalla.getByText(estrellas)).toBeTruthy();
    });
    and('no enseña el nombre', () => {
      expect(pantalla.queryByText('Casa Lucio')).toBeNull();
    });
  });

  test('El pin elegido enseña el nombre', ({ given, when, then }) => {
    let pantalla: ReturnType<typeof render>;
    given('un restaurante pendiente llamado "Casa Lucio" con 4 estrellas', () => {});
    when('se dibuja su pin elegido en el mapa', () => {
      pantalla = render(<MapMarker name="Casa Lucio" visited={false} rating={4} isSelected />);
    });
    then('el pin muestra "Casa Lucio"', () => {
      expect(pantalla.getByText('Casa Lucio')).toBeTruthy();
    });
  });
});
