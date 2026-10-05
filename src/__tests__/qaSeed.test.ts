// Garantiza que la semilla de QA (scripts/qa/seed-data.js) sigue produciendo nombre y coords sin red.
import { parseSharedText } from '../utils/shareParser';

const { SEED } = require('../../scripts/qa/seed-data');

describe('semilla QA', () => {
  for (const r of SEED as { name: string; lat: number; lng: number; text: string }[]) {
    it(`${r.name} se parsea con nombre y coords`, () => {
      expect(parseSharedText(r.text)).toMatchObject({ name: r.name, latitude: r.lat, longitude: r.lng });
    });
  }
});
