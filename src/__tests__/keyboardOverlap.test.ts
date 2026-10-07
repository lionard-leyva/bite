import { keyboardOverlap } from '../utils/keyboardOverlap';

describe('keyboardOverlap', () => {
  it('devuelve cuanto tapa el teclado a una vista que llega hasta el borde inferior', () => {
    expect(keyboardOverlap(2400, 1517)).toBe(883);
  });

  it('devuelve 0 si la vista ya termina sobre el teclado (la ventana se redimensiono sola)', () => {
    expect(keyboardOverlap(1517, 1517)).toBe(0);
    expect(keyboardOverlap(1400, 1517)).toBe(0);
  });

  it('devuelve 0 con medidas no validas en vez de NaN o negativos', () => {
    expect(keyboardOverlap(NaN, 1517)).toBe(0);
    expect(keyboardOverlap(2400, Number.NaN)).toBe(0);
  });
});
