import { PRICE_VALUES } from '../config/constants';

// Precio por persona -> "€" a "€€€€€" segun su nivel en el selector de Guardar (10, 20, 35, 50, 100), como en el diseno.
export function priceSymbols(price: number | null | undefined): string {
  if (!price) return '';
  const level = PRICE_VALUES.indexOf(price as (typeof PRICE_VALUES)[number]);
  return level >= 0 ? '€'.repeat(level + 1) : '';
}
