// Los .feature son la definición de los comportamientos de negocio: cada @ID debe estar enlazado
// desde su fila de docs/qa/e2e-plan.md, y el enlace debe apuntar al archivo donde vive el escenario.
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const plan = fs.readFileSync(path.join(root, 'docs/qa/e2e-plan.md'), 'utf8');
const planDir = path.join(root, 'docs/qa');

const features = fs
  .readdirSync(path.join(root, 'features'))
  .filter((f) => f.endsWith('.feature'))
  .map((f) => ({ file: f, text: fs.readFileSync(path.join(root, 'features', f), 'utf8') }));

const tags = features.flatMap(({ file, text }) =>
  [...new Set([...text.matchAll(/^\s*@([A-Z]+-\d+)\s*$/gm)].map((m) => m[1]))].map((id) => ({ id, file })),
);

const filaDe = (id: string) => plan.split('\n').find((l) => l.startsWith(`| ${id} |`));

describe('enlaces entre los .feature y docs/qa/e2e-plan.md', () => {
  it('hay escenarios etiquetados', () => {
    expect(tags.length).toBeGreaterThan(0);
  });

  it.each(tags.map((t) => [t.id, t.file]))('%s está en el plan y enlaza a %s', (id, file) => {
    const fila = filaDe(id);
    expect(fila).toBeDefined();
    expect(fila).toContain(`](../../features/${file})`);
  });

  it('todos los enlaces a features del plan apuntan a archivos que existen', () => {
    const links = [...plan.matchAll(/\]\((\.\.\/\.\.\/features\/[^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(fs.existsSync(path.resolve(planDir, l))).toBe(true);
  });
});
