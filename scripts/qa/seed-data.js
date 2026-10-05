// Datos de prueba del plan E2E (docs/qa/e2e-plan.md §1). Validados por src/__tests__/qaSeed.test.ts contra shareParser.
const maps = (name, lat, lng) =>
  `https://www.google.com/maps/place/${name.replace(/ /g, '+')}/@${lat},${lng},17z/data=!3d${lat}!4d${lng}`;

const SEED = [
  { name: 'Casa Lucio', lat: 40.4123, lng: -3.7086 },
  { name: 'Sobrino de Botin', lat: 40.414, lng: -3.7081 },
  { name: 'Gyoza Bar jpq', lat: 40.425, lng: -3.7 },
].map((r) => ({ ...r, text: maps(r.name, r.lat, r.lng) }));

module.exports = { SEED };
