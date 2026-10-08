// Regla KBD-03: un TextInput con `height` fija menor que su interlineado corta los descendentes (g, j, p, q, y).
export interface MedidasCampo {
  height?: number;
  minHeight?: number;
  lineHeight?: number;
  fontSize?: number;
}

export function problemaDeAltura(m: MedidasCampo): string | null {
  if (m.height == null) return null;
  const interlineado = m.lineHeight ?? (m.fontSize != null ? Math.ceil(m.fontSize * 1.25) : undefined);
  if (interlineado == null || m.height >= interlineado) return null;
  return `height ${m.height} < interlineado ${interlineado}`;
}

// Interlineados de los tamanos de texto de tailwind.config.js.
const LINE_HEIGHT_CLASE: Record<string, number> = { hero: 40, title: 32, subtitle: 26, body: 24, caption: 18, label: 16 };

function bloqueEquilibrado(src: string, desde: number, abre: string, cierra: string): string {
  let prof = 0;
  for (let i = desde; i < src.length; i++) {
    if (src[i] === abre) prof++;
    else if (src[i] === cierra && --prof === 0) return src.slice(desde, i + 1);
  }
  return src.slice(desde);
}

// Etiqueta <TextInput ...> completa: el primer '>' fuera de llaves es su cierre (las flechas '=>' van dentro de llaves).
function etiquetaTextInput(src: string, desde: number): string {
  let llaves = 0;
  for (let i = desde; i < src.length; i++) {
    if (src[i] === '{') llaves++;
    else if (src[i] === '}') llaves--;
    else if (src[i] === '>' && llaves === 0) return src.slice(desde, i + 1);
  }
  return src.slice(desde);
}

function numero(texto: string, re: RegExp): number | undefined {
  const m = re.exec(texto);
  return m ? Number(m[1]) : undefined;
}

function medidas(texto: string): MedidasCampo {
  const clase = /className="([^"]*)"/.exec(texto)?.[1] ?? '';
  const claseH = numero(clase, /(?:^|\s)h-(\d+)(?:\s|$)/);
  const claseTexto = /(?:^|\s)text-(hero|title|subtitle|body|caption|label)(?:\s|$)/.exec(clase)?.[1];
  return {
    // `height:` en minuscula no casa con minHeight ni maxHeight.
    height: numero(texto, /\bheight:\s*(\d+)/) ?? (claseH != null ? claseH * 4 : undefined),
    lineHeight: numero(texto, /lineHeight:\s*(\d+)/) ?? (claseTexto ? LINE_HEIGHT_CLASE[claseTexto] : undefined),
    fontSize: numero(texto, /fontSize:\s*(\d+)/),
  };
}

const lineaDe = (src: string, i: number) => src.slice(0, i).split('\n').length;

export function auditarCamposDeTexto(src: string): {
  campos: number;
  problemas: Array<{ linea: number; problema: string }>;
} {
  const problemas: Array<{ linea: number; problema: string }> = [];
  let campos = 0;

  for (const m of src.matchAll(/<TextInput\b/g)) {
    campos++;
    const etiqueta = etiquetaTextInput(src, m.index!);
    // style={estilos.clave}: se suma el bloque `clave: { ... }` del mismo archivo.
    let texto = etiqueta;
    for (const ref of etiqueta.matchAll(/style=\{\s*\w+\.(\w+)\s*\}/g)) {
      const def = new RegExp(`\\b${ref[1]}:\\s*\\{`).exec(src);
      if (def) texto += bloqueEquilibrado(src, def.index + def[0].length - 1, '{', '}');
    }
    const p = problemaDeAltura(medidas(texto));
    if (p) problemas.push({ linea: lineaDe(src, m.index!), problema: p });
  }

  // Estilos `textInput: { ... }` de librerias (GooglePlacesAutocomplete).
  for (const m of src.matchAll(/\btextInput:\s*\{/g)) {
    campos++;
    const p = problemaDeAltura(medidas(bloqueEquilibrado(src, m.index! + m[0].length - 1, '{', '}')));
    if (p) problemas.push({ linea: lineaDe(src, m.index!), problema: p });
  }
  return { campos, problemas };
}
