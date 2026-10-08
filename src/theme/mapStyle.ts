import type { Colors } from './palette';

// Estilo de Google Maps hecho solo con colores de la paleta: el mapa cambia con el tema como el resto de la app.
export function mapStyle(c: Colors) {
  return [
    { elementType: 'geometry', stylers: [{ color: c.background }] },
    { elementType: 'labels.text.fill', stylers: [{ color: c['text-secondary'] }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: c.background }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: c.surface }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: c.border }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: c['map-water'] }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: c['map-park'] }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ];
}
