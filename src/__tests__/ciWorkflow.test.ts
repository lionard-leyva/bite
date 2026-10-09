// Guardian de la estrategia de CI (CLAUDE.md §10): la unica comprobacion que se exige para fusionar es el job "CI ok",
// y debe depender de todos los demas; si alguien anade un job y se olvida de la puerta, este test falla.
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml');

const load = (file: string) => yaml.load(fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', file), 'utf8'));

describe('ci.yml', () => {
  const ci = load('ci.yml');
  const ids = Object.keys(ci.jobs);

  test('tiene un job puerta "CI ok" que depende de todos los demas', () => {
    const gate = ci.jobs.gate;
    expect(gate).toBeDefined();
    expect(gate.name).toBe('CI ok');
    expect([...gate.needs].sort()).toEqual(ids.filter((id) => id !== 'gate').sort());
  });

  test('la puerta corre aunque falle otro job y falla si alguno no esta en success', () => {
    const gate = ci.jobs.gate;
    expect(gate.if).toBe('always()');
    const script = JSON.stringify(gate.steps);
    expect(script).toContain('toJSON(needs)');
    expect(script).toContain('!= \\"success\\"');
  });

  test('todos los jobs tienen limite de tiempo', () => {
    for (const id of ids) expect(ci.jobs[id]['timeout-minutes']).toBeGreaterThan(0);
  });
});

describe('qa-e2e.yml', () => {
  const e2e = load('qa-e2e.yml');

  test('en PR solo corre si cambia algo visible o nativo (no por docs, tests ni workflows)', () => {
    const paths: string[] = e2e.on.pull_request.paths;
    expect(paths).toEqual(expect.arrayContaining(['src/**', 'modules/**', 'app.config.js', 'package-lock.json']));
    expect(paths).not.toContain('**');
    expect(paths.some((p) => p.startsWith('docs') || p.startsWith('features'))).toBe(false);
  });

  test('en PR y a demanda rapida corre solo los P0; de noche, la suite entera', () => {
    const scope = e2e.jobs.e2e.env.E2E_SCOPE;
    expect(scope).toContain("github.event_name == 'pull_request' && 'p0'");
    expect(scope).toContain('inputs.scope');
    const script = JSON.stringify(e2e.jobs.e2e.steps);
    expect(script).toContain('\\"$E2E_SCOPE\\" = p0');
    expect(script).toContain('--p0');
    expect(e2e.on.schedule).toBeDefined();
    expect(e2e.on.workflow_dispatch.inputs.scope.options).toEqual(['full', 'p0']);
  });

  test('un push nuevo cancela solo el E2E de su misma rama', () => {
    expect(e2e.concurrency.group).toContain('github.ref');
    expect(e2e.concurrency['cancel-in-progress']).toBe(true);
  });
});

describe('expo-preview.yml', () => {
  test('no publica en el movil sin pasar antes typecheck y Jest', () => {
    const steps: Array<{ run?: string; name?: string }> = load('expo-preview.yml').jobs.publish.steps;
    const idx = (pred: (s: { run?: string; name?: string }) => boolean) => steps.findIndex(pred);
    const publicar = idx((s) => (s.run ?? '').includes('eas-cli') && (s.run ?? '').includes('update'));
    expect(publicar).toBeGreaterThan(-1);
    expect(idx((s) => s.run === 'npm run typecheck')).toBeGreaterThan(-1);
    expect(idx((s) => s.run === 'npm test')).toBeGreaterThan(-1);
    expect(idx((s) => s.run === 'npm run typecheck')).toBeLessThan(publicar);
    expect(idx((s) => s.run === 'npm test')).toBeLessThan(publicar);
  });
});
