// Diagnostico QA: cuando un paso del E2E no encuentra un elemento, el error debe decir que habia en pantalla
// (el log de CI es lo unico que se puede leer; las capturas van en un artefacto).
const { parseNodes } = require('../../scripts/qa/adb');
const { summarize, missingMessage } = require('../../scripts/qa/screen-summary');

const PKG = 'com.lionardleyva.bite';
const node = (text: string, desc = '', pkg = PKG) =>
  `<node index="0" text="${text}" class="android.widget.TextView" package="${pkg}" content-desc="${desc}" ` +
  `clickable="false" bounds="[0,0][100,100]" />`;
const xml = (...nodes: string[]) => `<hierarchy>${nodes.join('')}</hierarchy>`;
const run = (x: string, max?: number) => summarize(parseNodes(x), PKG, max);

describe('screen summary', () => {
  it('lista los textos y descripciones de Bite en orden, sin vacios ni repetidos', () => {
    const out = run(xml(node('Mapa'), node('', 'Guardar restaurante'), node(''), node('Mapa')));
    expect(out).toEqual(['Mapa', 'Guardar restaurante']);
  });

  it('recorta los textos largos y respeta el maximo', () => {
    const out = run(xml(node('x'.repeat(200)), node('a'), node('b'), node('c')), 2);
    expect(out[0]).toHaveLength(60);
    expect(out).toHaveLength(2);
  });

  it('separa lo que es de otro paquete (un dialogo del sistema tapando la app)', () => {
    // el dialogo aparece primero en el arbol: aun asi va despues de lo de Bite y no gasta su cupo
    const out = run(xml(node('While using the app', '', 'com.android.permissioncontroller'), node('Mapa'), node('Lista')), 2);
    expect(out).toEqual(['Mapa', 'Lista', '[com.android.permissioncontroller] While using the app']);
  });

  it('avisa cuando no hay nada que mostrar', () => {
    expect(run(xml())).toEqual([]);
  });

  it('el mensaje de "no aparece" incluye lo que si habia en pantalla', () => {
    const nodes = parseNodes(xml(node('Mapa'), node('Lista')));
    expect(missingMessage('Guardar', nodes, PKG)).toBe('No aparece "Guardar". En pantalla: Mapa | Lista');
    expect(missingMessage(/pendientes/i, [], PKG)).toBe('No aparece "/pendientes/i". En pantalla: (nada legible)');
  });
});
