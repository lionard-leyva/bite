// Regla de SAF-01: que elementos de Bite se solapan con la status bar o la barra de gestos.
const { offenders } = require('../../scripts/qa/safearea-offenders');

const SCREEN_H = 2400;
const TOP = 136; // pixel_7: status bar
const BOTTOM = 63; // pixel_7 con navegacion por gestos (24dp)

const node = (text: string, y1: number, y2: number) =>
  `<node index="0" text="${text}" class="android.widget.TextView" package="com.lionardleyva.bite" ` +
  `content-desc="" clickable="false" bounds="[42,${y1}][1038,${y2}]" />`;

const names = (xml: string) => offenders(xml, TOP, BOTTOM, SCREEN_H).map((n: { text: string }) => n.text);

describe('safearea offenders', () => {
  it('marca una etiqueta de pestana dentro de la zona de gestos (el bug original)', () => {
    expect(names(node('Mapa', 2341, 2380))).toEqual(['Mapa']);
  });

  it('no marca la etiqueta cuando termina justo donde empieza la zona de gestos (tras el arreglo)', () => {
    expect(names(node('Mapa', 2299, 2338))).toEqual([]);
  });

  it('marca un elemento bajo la barra de estado (la X de Guardar sobre el reloj)', () => {
    expect(names(node('Guardar restaurante', 53, 114))).toEqual(['Guardar restaurante']);
  });

  it('no marca un elemento cortado por el borde de la pantalla: el scroll continua fuera', () => {
    expect(names(node('Guardar', 2363, 2400))).toEqual([]);
  });
});
