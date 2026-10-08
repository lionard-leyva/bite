export type ColorName =
  | 'background' | 'surface'
  | 'text-primary' | 'text-secondary' | 'text-tertiary'
  | 'border'
  | 'primary' | 'on-primary' | 'primary-light'
  | 'visited' | 'on-visited' | 'visited-light'
  | 'danger' | 'on-danger'
  | 'warning' | 'star';
export type Colors = Record<ColorName, string>;
export type Scheme = 'light' | 'dark';
export const palette: Record<Scheme, Colors>;
export function channels(hex: string): string;
export function cssVars(colors: Colors): Record<string, string>;
