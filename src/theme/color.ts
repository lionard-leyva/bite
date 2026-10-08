// "#2A1D1A" + 0.5 -> "rgba(42, 29, 26, 0.5)": para velos y sombras que necesitan transparencia sobre un color del tema.
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
