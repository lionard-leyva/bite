// isPermissionGranted: lee de `dumpsys package` si un permiso de ejecucion esta concedido (qa:location --deny lo usa
// para comprobar que el caso de verdad probo la denegacion y no la concedio un dialogo del sistema).
const { isPermissionGranted } = require('../../scripts/qa/permissions');

const FINE = 'android.permission.ACCESS_FINE_LOCATION';
const dump = (fine: string, coarse = 'granted=false, flags=[ USER_SET]') => `
Packages:
  Package [com.lionardleyva.bite] (abc123):
    install permissions:
      android.permission.INTERNET: granted=true
      android.permission.ACCESS_FINE_LOCATION_ELSEWHERE: granted=true
    User 0: ceDataInode=1 installed=true hidden=false
      runtime permissions:
        android.permission.ACCESS_COARSE_LOCATION: ${coarse}
        ${FINE}: ${fine}
`;

describe('isPermissionGranted', () => {
  it('true cuando el permiso esta concedido', () => {
    expect(isPermissionGranted(dump('granted=true, flags=[ USER_SET]'), FINE)).toBe(true);
  });

  it('false cuando esta denegado, aunque otro permiso parecido este concedido', () => {
    expect(isPermissionGranted(dump('granted=false, flags=[ USER_SET|USER_FIXED]', 'granted=true, flags=[]'), FINE)).toBe(false);
  });

  it('no confunde un permiso con otro que empieza igual', () => {
    expect(isPermissionGranted(dump('granted=false, flags=[ USER_SET]'), FINE)).toBe(false);
  });

  it('null cuando el permiso no aparece (no se puede afirmar nada)', () => {
    expect(isPermissionGranted('Packages:\n  nada\n', FINE)).toBeNull();
  });

  it('si aparece en install y en runtime manda el de ejecucion (el ultimo)', () => {
    const d = `
    install permissions:
      ${FINE}: granted=true
    User 0:
      runtime permissions:
        ${FINE}: granted=false, flags=[ USER_SET|USER_FIXED]
`;
    expect(isPermissionGranted(d, FINE)).toBe(false);
  });

  it('un permiso parecido que aparece despues no tapa al buscado', () => {
    const d = `
      runtime permissions:
        ${FINE}: granted=false, flags=[ USER_SET]
        ${FINE}_ELSEWHERE: granted=true, flags=[]
`;
    expect(isPermissionGranted(d, FINE)).toBe(false);
  });
});
