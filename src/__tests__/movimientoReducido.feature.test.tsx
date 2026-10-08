// Acceptance: features/movimiento-reducido.feature (UI-09 del plan E2E). Componentes reales; AccessibilityInfo simulado.
import { AccessibilityInfo, Animated } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import RestaurantCard from '../components/RestaurantCard';
import FAB from '../components/FAB';
import UserLocationMarker from '../components/UserLocationMarker';
import type { Restaurant } from '../types';

jest.mock('react-native-maps', () => ({ Marker: require('react-native').View }));

const feature = loadFeature('features/movimiento-reducido.feature');

const restaurante: Restaurant = {
  id: '1', name: 'Casa Lucio', address: 'Cava Baja 35', latitude: 40.4, longitude: -3.7, rating: 4, note: '',
  photoURL: null, photoURLs: [], visited: false, createdBy: 'ana', createdAt: new Date(), updatedAt: new Date(), listId: 'L1',
};

function simularReducirMovimiento(activo: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(activo);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
}

async function pulsar(elemento: string) {
  const spring = jest.spyOn(Animated, 'spring');
  const pantalla =
    elemento === 'la tarjeta de restaurante'
      ? render(<RestaurantCard restaurant={restaurante} onPress={() => {}} />)
      : render(<FAB onPress={() => {}} />);
  await act(async () => {});
  const boton = pantalla.getByRole('button');
  fireEvent(boton, 'pressIn');
  return spring;
}

defineFeature(feature, (test) => {
  afterEach(() => jest.restoreAllMocks());

  test('Con reducir movimiento el elemento no se anima al pulsarlo', ({ given, when, then }) => {
    let spring: jest.SpyInstance;
    given('que el teléfono tiene activado reducir movimiento', () => simularReducirMovimiento(true));
    when(/^Ana pulsa (.*)$/, async (elemento: string) => {
      spring = await pulsar(elemento);
    });
    then(/^(.*) no se encoge$/, () => {
      const encogidos = spring.mock.calls.filter(([, cfg]: any) => cfg.toValue < 1);
      expect(encogidos).toEqual([]);
    });
  });

  test('Sin reducir movimiento la tarjeta se encoge al pulsarla', ({ given, when, then }) => {
    let spring: jest.SpyInstance;
    given('que el teléfono no tiene activado reducir movimiento', () => simularReducirMovimiento(false));
    when('Ana pulsa la tarjeta de restaurante', async () => {
      spring = await pulsar('la tarjeta de restaurante');
    });
    then('la tarjeta de restaurante se encoge un poco', () => {
      const encogidos = spring.mock.calls.filter(([, cfg]: any) => cfg.toValue < 1);
      expect(encogidos.length).toBeGreaterThan(0);
    });
  });

  test('Con reducir movimiento el punto de tu ubicación no pulsa', ({ given, when, then }) => {
    const bucles: Array<{ start: jest.Mock; stop: jest.Mock }> = [];
    given('que el teléfono tiene activado reducir movimiento', () => simularReducirMovimiento(true));
    when('se muestra el punto de la ubicación de Ana en el mapa', async () => {
      jest.spyOn(Animated, 'loop').mockImplementation((() => {
        const bucle = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
        bucles.push(bucle);
        return bucle;
      }) as any);
      render(<UserLocationMarker latitude={40.4} longitude={-3.7} />);
      await act(async () => {});
    });
    then('el punto se queda quieto', () => {
      // Puede arrancar antes de saber la preferencia; una vez conocida, ningun bucle puede seguir en marcha.
      const enMarcha = bucles.filter((b) => b.start.mock.calls.length > b.stop.mock.calls.length);
      expect(enMarcha).toEqual([]);
    });
  });
});
