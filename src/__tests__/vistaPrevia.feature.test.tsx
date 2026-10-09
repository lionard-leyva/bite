// Acceptance: features/vista-previa.feature (PRE-01 del plan E2E). Configuracion real de la app.
import { defineFeature, loadFeature } from 'jest-cucumber';

const feature = loadFeature('features/vista-previa.feature');

defineFeature(feature, (test) => {
  test('La configuración apunta las vistas previas al proyecto de Expo', ({ given, when, then, and }) => {
    let config: any;
    given('la configuración de la app Bite', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = require('../../app.config.js').default({ config: {} });
    });
    when('se leen sus actualizaciones', () => {});
    then('apuntan al proyecto de Expo de Bite', () => {
      expect(config.updates.url).toBe(`https://u.expo.dev/${config.extra.eas.projectId}`);
    });
    and('comparten versión de ejecución con la versión de la app', () => {
      expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
    });
    and('las builds propias no las descargan solas', () => {
      expect(config.updates.enabled).toBe(false);
    });
  });
});
