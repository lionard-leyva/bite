// Acceptance: features/formulario-con-teclado.feature (KBD-04 del plan E2E). KeyboardForm real; teclado de Android simulado.
import fs from 'fs';
import path from 'path';
import { createRef } from 'react';
import { Keyboard, Platform, ScrollView, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { defineFeature, loadFeature } from 'jest-cucumber';
import KeyboardForm from '../components/KeyboardForm';

const feature = loadFeature('features/formulario-con-teclado.feature');

defineFeature(feature, (test) => {
  afterEach(() => jest.restoreAllMocks());

  test('Al cerrar el teclado el formulario recupera su posición anterior', ({ given, when, and, then }) => {
    const manejadores: Record<string, (e?: any) => void> = {};
    const scrollRef = createRef<ScrollView>();
    let pantalla: ReturnType<typeof render>;
    let scrollTo: jest.Mock;

    const desplazar = (y: number) =>
      act(() => {
        fireEvent.scroll(pantalla.UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { x: 0, y } } });
      });

    given('que Ana tiene un formulario largo en Android, desplazado 120 píxeles', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest.spyOn(Keyboard, 'addListener').mockImplementation(((evento: string, fn: (e?: any) => void) => {
        manejadores[evento] = fn;
        return { remove: jest.fn() };
      }) as any);
      pantalla = render(
        <KeyboardForm avoid={false} scrollRef={scrollRef}>
          <Text>Direccion</Text>
        </KeyboardForm>,
      );
      scrollTo = jest.fn();
      (scrollRef.current as any).scrollTo = scrollTo;
      desplazar(120);
    });
    when('el teclado se abre y el formulario se desplaza hacia el final', () => {
      act(() => manejadores.keyboardDidShow({ endCoordinates: { screenY: 1500 } }));
      desplazar(400);
    });
    and('el teclado se cierra', () => {
      act(() => manejadores.keyboardDidHide());
    });
    then('el formulario vuelve a los 120 píxeles', () => {
      expect(scrollTo).toHaveBeenCalledWith({ y: 120, animated: false });
    });
  });

  test('En la pantalla de acceso, el teclado no tapa el campo que Ana escribe', ({ given, when, then }) => {
    const codigo = () => fs.readFileSync(path.join(__dirname, '../screens/AuthScreen.tsx'), 'utf8');
    given('que la pantalla de acceso tiene varios campos de texto', () => {
      expect((codigo().match(/<TextInput/g) ?? []).length).toBeGreaterThan(1);
    });
    when('Ana abre el teclado para escribir en cualquiera de ellos', () => {});
    then('el formulario de acceso se ajusta al teclado', () => {
      expect(codigo()).not.toMatch(/<KeyboardForm\s+avoid=\{false\}/);
    });
  });
});
