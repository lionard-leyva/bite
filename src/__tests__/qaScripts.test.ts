// Scripts adb de QA que cubren los casos pendientes del plan (MAP-04, MAP-06, PRF-01, SAF-02), probados con un `adb`
// falso: la pantalla responde segun lo que el script toca y escribe. No sustituye al emulador (eso lo hace qa-e2e.yml):
// comprueba que cada script da PASS con la pantalla correcta y FAIL con la incorrecta, y que no hace nada peligroso.
// Las funciones `screen` se serializan al adb falso: sin variables del test, solo `log`, `tree`, `tapped` y `data`.
import { runScript } from './helpers/fakeAdb';

jest.setTimeout(240000);

describe('MAP-04 qa:empty', () => {
  const screen = (_log: string[], tree: any, _tapped: any, data: any) =>
    tree(
      ([{ text: 'Mapa', x: 200, y: 2300 }] as any[])
        .concat(
          data.mensaje
            ? [{ text: 'Tu mapa esta vacio', x: 540, y: 900 }].concat(
                data.sinInvitacion ? [] : [{ text: 'Guarda tu primer restaurante para empezar', x: 540, y: 1000 }],
              )
            : [],
        )
        .concat(data.tarjeta ? [{ desc: '¿Dónde cenamos hoy? 3 pendientes', x: 540, y: 2000 }] : []),
    );

  it('da PASS con el mapa vacio y su mensaje', () => {
    const r = runScript('empty.js', [], { screen, data: { mensaje: true, tarjeta: false } });
    expect(r.out).toContain('PASS qa:empty');
    expect(r.status).toBe(0);
  });

  it('da FAIL si no sale el mensaje de mapa vacio', () => {
    const r = runScript('empty.js', [], { screen, data: { mensaje: false, tarjeta: false } });
    expect(r.out).toContain('FAIL qa:empty');
    expect(r.status).toBe(1);
  });

  it('da FAIL si falta la invitacion a guardar el primer restaurante', () => {
    const r = runScript('empty.js', [], { screen, data: { mensaje: true, tarjeta: false, sinInvitacion: true } });
    expect(r.out).toMatch(/FAIL .*primer restaurante/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si con el mapa vacio sale la tarjeta de "Donde cenamos hoy"', () => {
    const r = runScript('empty.js', [], { screen, data: { mensaje: true, tarjeta: true } });
    expect(r.out).toMatch(/FAIL .*cenamos/i);
    expect(r.status).toBe(1);
  });
});

describe('MAP-06 qa:map-controls', () => {
  // Pantalla con estado: reconstruye la busqueda escrita a partir del log.
  const screen = (log: string[], tree: any, _tapped: any, data: any) => {
    let query = '';
    for (const l of log) {
      const t = l.match(/^shell input text (.*)$/);
      if (t) query += t[1];
      if (l === 'shell input keyevent 67') query = query.slice(0, -1);
    }
    const tabs: any[] = [{ text: 'Mapa', x: 200, y: 2300 }];
    const hayCoincidencia = 'casa lucio'.indexOf(query.toLowerCase()) >= 0 && !(data.todoVacio && query !== '');
    return tree(
      tabs
        .concat([
          // Como en el emulador real: con texto el campo anuncia el texto y deja de anunciar su placeholder.
          query ? { text: query, x: 300, y: 200 } : { hint: 'Buscar en esta zona', x: 300, y: 200 },
        ] as any)
        .concat(data.conExpandir ? [{ desc: 'Expandir mapa', x: 900, y: 700 }] : [])
        .concat(!hayCoincidencia && !data.noFiltra ? [{ text: 'Tu mapa esta vacio', x: 540, y: 900 }] : []),
    );
  };

  it('da PASS: la busqueda filtra y se limpia, y no queda boton de expandir', () => {
    const r = runScript('map-controls.js', ['--match', 'lucio'], { screen, data: {} });
    expect(r.out).toContain('PASS qa:map-controls');
    expect(r.status).toBe(0);
  });

  it('da FAIL si una busqueda sin coincidencias no vacia el mapa', () => {
    const r = runScript('map-controls.js', ['--match', 'lucio'], { screen, data: { noFiltra: true } });
    expect(r.out).toMatch(/FAIL .*sin coincidencias/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si una busqueda que si coincide tambien vacia el mapa', () => {
    const r = runScript('map-controls.js', ['--match', 'lucio'], { screen, data: { todoVacio: true } });
    expect(r.out).toMatch(/FAIL .*con coincidencia/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si vuelve a aparecer el boton de expandir el mapa', () => {
    const r = runScript('map-controls.js', ['--match', 'lucio'], { screen, data: { conExpandir: true } });
    expect(r.out).toMatch(/FAIL .*expandir/i);
    expect(r.status).toBe(1);
  });
});

describe('PRF-01 qa:profile', () => {
  const CREAR = 'shell input tap 500 1500';
  const CANCELAR = 'shell input tap 300 1700';
  const screen = (log: string[], tree: any, _tapped: any, data: any) => {
    let perfil = false;
    let modal = false;
    for (const l of log) {
      if (l === 'shell input tap 880 2300') perfil = true;
      if (perfil && l === 'shell input tap 500 1500' && !data.noModal) modal = true;
      if (l === 'shell input tap 300 1700' && !data.noCierra) modal = false;
      if (l === 'shell input tap 700 1700') modal = false; // "Continuar": cierra sesion (el script no debe pulsarlo)
    }
    const tabs: any[] = [
      { text: 'Mapa', x: 200, y: 2300 },
      { text: 'Perfil', x: 880, y: 2300 },
    ];
    // Contenido tardio: tras tocar "Perfil" las primeras `carga` capturas aun no lo muestran (visto en el emulador real).
    let capturasTrasTocar = 0;
    let tocado = false;
    for (const l of log) {
      if (l === 'shell input tap 880 2300') {
        tocado = true;
        capturasTrasTocar = 0;
      } else if (tocado && l.indexOf('uiautomator dump') >= 0) capturasTrasTocar++;
    }
    if (!perfil || (data.carga && capturasTrasTocar <= data.carga)) return tree(tabs);
    if (modal) {
      // El aviso se dibuja sobre el Perfil, que sigue en el arbol.
      return tree(
        tabs.concat([
          { text: 'Modo sin cuenta', x: 540, y: 600 },
          { text: 'Crear cuenta', x: 540, y: 1000 },
          { text: 'Tienes 4 restaurantes guardados. Al crear cuenta podras sincronizarlos y compartir.', x: 540, y: 1100 },
          { text: 'Cancelar', x: 300, y: 1700 },
          { text: 'Continuar', x: 700, y: 1700 },
        ]),
      );
    }
    return tree(
      tabs
        .concat([
          { text: 'Modo sin cuenta', x: 540, y: 600 },
          { text: 'Tienes 4 restaurantes guardados localmente. Crea una cuenta para sincronizar y compartir.', x: 540, y: 800 },
          { text: 'Crear cuenta', x: 500, y: 1500 },
        ])
        .concat(data.compartir ? [{ text: 'Compartir con pareja o grupo', x: 540, y: 1200 }] : [])
        // Bajo el pliegue: solo sale en el volcado despues de deslizar.
        .concat(
          data.compartirAbajo && log.some((l) => l.indexOf('input swipe') >= 0)
            ? [{ text: 'Gestionar lista compartida', x: 540, y: 1200 }]
            : [],
        ),
    );
  };

  it('da PASS: sin cuenta se ofrece crear cuenta, no compartir, y el aviso se cancela', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: {} });
    expect(r.out).toContain('PASS qa:profile');
    expect(r.status).toBe(0);
    expect(r.log).toContain(CREAR);
    expect(r.log).toContain(CANCELAR);
  });

  it('nunca pulsa "Continuar": cerraria la sesion sin cuenta', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: {} });
    expect(r.log).not.toContain('shell input tap 700 1700');
  });

  it('da FAIL si sin cuenta aparece "Compartir con pareja o grupo"', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: { compartir: true } });
    expect(r.out).toMatch(/FAIL .*compartir/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si la opcion de compartir esta bajo el pliegue (la ausencia se comprueba al deslizar)', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: { compartirAbajo: true } });
    expect(r.out).toMatch(/FAIL .*compartir/i);
    expect(r.status).toBe(1);
  });

  it('espera a que cargue el Perfil antes de juzgarlo (contenido tardio)', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: { carga: 3 } });
    expect(r.out).toContain('PASS qa:profile');
    expect(r.status).toBe(0);
  });

  it('da FAIL si "Crear cuenta" no abre el aviso', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: { noModal: true } });
    expect(r.out).toMatch(/FAIL .*aviso/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si cancelar no cierra el aviso', () => {
    const r = runScript('profile.js', ['--count', '4'], { screen, data: { noCierra: true } });
    expect(r.out).toMatch(/FAIL .*cancelar cierra el aviso/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si el contador de restaurantes locales no coincide', () => {
    const r = runScript('profile.js', ['--count', '7'], { screen, data: {} });
    expect(r.out).toMatch(/FAIL .*guardados/i);
    expect(r.status).toBe(1);
  });
});

describe('SAF-02 qa:safearea --nav3', () => {
  const OVERLAY = 'shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.';
  const replies = {
    'cmd overlay list': '[x] com.android.internal.systemui.navbar.gestural\n[ ] com.android.internal.systemui.navbar.threebutton\n',
    'dumpsys window':
      '  InsetsSource type=statusBars frame=[0,0][1080,136] visible=true\n' +
      '  InsetsSource type=navigationBars frame=[0,2280][1080,2424] visible=true\n',
  };
  const screen = (log: string[], tree: any, tapped: any, data: any) =>
    tree(
      ([
        { text: 'Mapa', x: 200, y: 2100 },
        { text: 'Lista', x: 540, y: 2100 },
        { text: 'Perfil', x: 880, y: 2100 },
        { text: 'Guardar restaurante', x: 540, y: 1800 },
      ] as any[])
        .concat(data.bajoLaBarra ? [{ text: 'Guardar', x: 540, y: 2350 }] : [])
        // Contenido desplazable: solo queda bajo la barra mientras no se ha llegado al final del scroll.
        .concat(data.soloHastaElFinal && tapped(log, 540, 1800) && !log.some((l) => l.includes('input swipe')) ? [{ text: 'Elegir foto de galeria', x: 540, y: 2350 }] : []),
    );
  const run = (data: object) =>
    runScript('safearea.js', ['--nav3'], { screen, replies, data, env: { BITE_INSET_TOP: '136', BITE_INSET_BOTTOM: '63' } });

  it('activa la navegacion de 3 botones, mide la barra real y devuelve el modo anterior', () => {
    const r = run({});
    const on = r.log.indexOf(`${OVERLAY}threebutton`);
    const off = r.log.indexOf(`${OVERLAY}gestural`);
    expect(on).toBeGreaterThanOrEqual(0);
    expect(off).toBeGreaterThan(on);
    expect(r.log.filter((l) => l.includes('uiautomator dump')).length).toBeGreaterThan(0);
    // Los 63 px del entorno son de la navegacion por gestos: con 3 botones manda lo que dice dumpsys (144 px).
    expect(r.out).toContain('bottom=144px');
    expect(r.out).toContain('PASS qa:safearea');
  });

  it('devuelve el modo anterior tambien cuando un elemento queda bajo la barra', () => {
    const r = run({ bajoLaBarra: true });
    expect(r.out).toContain('FAIL qa:safearea');
    expect(r.log.indexOf(`${OVERLAY}gestural`)).toBeGreaterThan(r.log.indexOf(`${OVERLAY}threebutton`));
    expect(r.status).toBe(1);
  });

  it('en Guardar baja hasta el final antes de medir: el contenido desplazable puede pasar bajo la barra a mitad de scroll', () => {
    const r = run({ soloHastaElFinal: true });
    expect(r.out).toContain('PASS qa:safearea');
  });

  it('restaura el modo que habia, no siempre el de gestos', () => {
    const r = runScript('safearea.js', ['--nav3'], {
      screen,
      data: {},
      replies: { ...replies, 'cmd overlay list': '[ ] com.android.internal.systemui.navbar.gestural\n[x] com.android.internal.systemui.navbar.twobutton\n' },
      env: { BITE_INSET_TOP: '136' },
    });
    const calls = r.log.filter((l) => l.startsWith(OVERLAY));
    expect(calls[calls.length - 1]).toBe(`${OVERLAY}twobutton`);
  });

  it('sin --nav3 no toca la navegacion del sistema', () => {
    const r = runScript('safearea.js', [], { screen, replies, data: {}, env: { BITE_INSET_TOP: '136', BITE_INSET_BOTTOM: '63' } });
    expect(r.log.some((l) => l.includes('cmd overlay'))).toBe(false);
  });
});

describe('MAP-02 qa:map --open-detail', () => {
  const screen = (log: string[], tree: any, _tapped: any, data: any) => {
    let callout = false;
    let detail = false;
    for (const l of log) {
      if (l === 'shell input tap 500 900') callout = true;
      if (callout && l === 'shell input tap 700 1800' && !data.noNavega) detail = true;
    }
    const tabs: any[] = [{ text: 'Mapa', x: 200, y: 2300 }];
    if (detail) {
      return tree(tabs.concat([{ text: data.otro ? 'Sobrino de Botin' : 'Casa Lucio', x: 540, y: 300 }, { text: 'Eliminar', x: 540, y: 2000 }]));
    }
    if (callout) {
      return tree(
        tabs.concat([
          { text: 'Casa Lucio', x: 540, y: 1600 },
          { text: 'Ver detalle', x: 700, y: 1800 },
          { text: 'Ir ahora', x: 300, y: 1800 },
        ]),
      );
    }
    return tree(tabs);
  };
  const args = ['--restaurant', 'Casa Lucio', '--marker', '500,900', '--open-detail'];

  it('da PASS: "Ver detalle" abre el detalle del mismo restaurante', () => {
    const r = runScript('map-callout.js', args, { screen, data: {} });
    expect(r.out).toContain('PASS qa:map');
    expect(r.status).toBe(0);
  });

  it('da FAIL si "Ver detalle" abre otro restaurante', () => {
    const r = runScript('map-callout.js', args, { screen, data: { otro: true } });
    expect(r.out).toMatch(/FAIL .*mismo restaurante/i);
    expect(r.status).toBe(1);
  });

  it('da FAIL si "Ver detalle" no navega', () => {
    const r = runScript('map-callout.js', args, { screen, data: { noNavega: true } });
    expect(r.out).toMatch(/FAIL .*abre el detalle/i);
    expect(r.status).toBe(1);
  });

  it('sin --open-detail no pulsa "Ver detalle"', () => {
    const r = runScript('map-callout.js', ['--restaurant', 'Casa Lucio', '--marker', '500,900'], { screen, data: {} });
    expect(r.log).not.toContain('shell input tap 700 1800');
    expect(r.out).toContain('PASS qa:map');
  });
});

// En la Lista la tarjeta de la cena dice "N pendientes": un selector /pendientes/i sin anclar la pulsaba en vez del filtro
// (E2E del PR #30: qa:share acababa en la pantalla de decision). Los filtros se pulsan por su texto exacto.
describe('filtros por texto exacto en los scripts de QA', () => {
  test('ningun script busca Todos/Pendientes/Visitados con un patron sin anclar', () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '../../scripts/qa');
    const culpables: string[] = [];
    for (const f of fs.readdirSync(dir).filter((n: string) => n.endsWith('.js'))) {
      fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((linea: string, i: number) => {
        if (/\/(?!\^)[^/\n]*(todos|pendientes|visitados)[^/\n]*\/i?/i.test(linea) && !/\/\^(todos|pendientes|visitados)\$\/i?/i.test(linea)) {
          culpables.push(`${f}:${i + 1}: ${linea.trim()}`);
        }
      });
    }
    expect(culpables).toEqual([]);
  });
});
