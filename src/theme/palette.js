// Unica fuente de colores de Bite (direccion "Terracota"). Es CommonJS para que tailwind.config.js pueda leerla.
// Cada nombre existe en claro y en oscuro; el contraste (WCAG 2.x) lo vigila features/tema.feature.
//
// Roles:
//  background / surface         fondo de pantalla y de tarjeta
//  text-primary|secondary|tertiary   texto, de mas a menos importante (todos >= 4,5:1 sobre background y surface)
//  border                       lineas finas decorativas
//  primary / on-primary / primary-light   marca (terracota), su texto y su tinte suave
//  visited / on-visited / visited-light   estado Visitado (salvia)
//  danger / on-danger           errores y acciones destructivas
//  warning / star               aviso y estrellas (graficos, >= 3:1 sobre surface)
const light = {
  background: '#F8F1EA',
  surface: '#FFFDFB',
  'text-primary': '#2A1D1A',
  'text-secondary': '#5F4C46',
  'text-tertiary': '#77625A',
  border: '#E5D6CA',
  primary: '#B84A33',
  'on-primary': '#FFFFFF',
  'primary-light': '#F8E4DC',
  visited: '#4E6B51',
  'on-visited': '#FFFFFF',
  'visited-light': '#E3EBE2',
  danger: '#B3261E',
  'on-danger': '#FFFFFF',
  warning: '#B87900',
  star: '#B87900',
};

const dark = {
  background: '#1C1513',
  surface: '#271D1A',
  'text-primary': '#F7EBE3',
  'text-secondary': '#BCA79D',
  'text-tertiary': '#A08D84',
  border: '#3A2C27',
  primary: '#E3745A',
  'on-primary': '#2A120C',
  'primary-light': '#3A2018',
  visited: '#8DB08F',
  'on-visited': '#10200F',
  'visited-light': '#243225',
  danger: '#F2938B',
  'on-danger': '#2B0805',
  warning: '#E5B03A',
  star: '#E5B03A',
};

// "#B84A33" -> "184 74 51": NativeWind compone rgb(var(--color-x) / alfa) y asi admite bg-primary/10.
function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
}

// { background: '#F8F1EA' } -> { '--color-background': '248 241 234' }
function cssVars(colors) {
  const out = {};
  for (const name of Object.keys(colors)) out[`--color-${name}`] = channels(colors[name]);
  return out;
}

module.exports = { palette: { light, dark }, channels, cssVars };
