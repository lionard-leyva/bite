// Cuanto tapa el teclado a una vista: 0 si ya termina sobre el, o si alguna medida no es valida.
export function keyboardOverlap(viewBottom: number, keyboardTop: number): number {
  if (!Number.isFinite(viewBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, viewBottom - keyboardTop);
}
