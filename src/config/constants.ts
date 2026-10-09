export const INVITE_CODE_LENGTH = 6;

export const PHOTO_MAX_WIDTH = 800;
export const PHOTO_QUALITY = 0.7;
export const PHOTO_MAX_COUNT = 3;

export const RATING_MAX = 5;

export const PLACES_API_DEBOUNCE_MS = 300;
export const PLACES_MIN_QUERY_LENGTH = 3;
export const PLACES_FETCH_TIMEOUT_MS = 6_000;

// Map markers
export const MARKER_SHADOW_RADIUS = 6;
export const MARKER_SHADOW_OPACITY = 0.18;

// Clustering
export const CLUSTER_RADIUS = 60;
export const CLUSTER_FONT_SIZE = 16;

// User location
export const USER_DOT_OUTER_SIZE = 44;
export const USER_DOT_INNER_SIZE = 16;
export const USER_DOT_PULSE_SCALE = 1.3;
export const USER_DOT_PULSE_DURATION = 2000;

// FAB / map padding
export const FAB_SIZE = 56;
export const FAB_BOTTOM_OFFSET = 32;

// Bottom card
export const CARD_BOTTOM_POSITION = 88;
export const CARD_HORIZONTAL_MARGIN = 16;

// Z-index hierarchy
export const Z_MARKER = 1;
export const Z_USER_LOCATION = 2;
export const Z_CLUSTER = 3;
export const Z_CARD = 200;
export const Z_MARKER_SELECTED = 999;

// Edge padding (when card visible)
export const EDGE_PADDING_TOP = 60;
export const EDGE_PADDING_RIGHT = 20;
export const EDGE_PADDING_BOTTOM = 300;
export const EDGE_PADDING_LEFT = 20;

// Directions proxy
export const DIRECTIONS_PROXY_URL = 'http://localhost:3001/api/directions';
export const DIRECTIONS_FETCH_TIMEOUT_MS = 10_000;

// Precio por persona (chips de Guardar)
export const PRICE_VALUES = [10, 20, 35, 50, 100] as const;
export const PRICE_LABELS = ['Súper barato', 'Económico', 'Normal', 'Caro', 'Lujo'] as const;
export const PRICE_DEFAULT = 20;

// Bottom sheet animation
export const SHEET_SPRING_TENSION = 65;
export const SHEET_SPRING_FRICTION = 11;
export const SHEET_DISMISS_TRANSLATE = 400;

// Drag handle
export const DRAG_HANDLE_WIDTH = 36;
export const DRAG_HANDLE_HEIGHT = 4;
export const DRAG_HANDLE_BORDER_RADIUS = 2;

