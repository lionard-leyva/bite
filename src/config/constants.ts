export const INVITE_CODE_LENGTH = 6;

export const PHOTO_MAX_WIDTH = 800;
export const PHOTO_QUALITY = 0.7;
export const PHOTO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const PHOTO_MAX_COUNT = 3;

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const PLACES_API_DEBOUNCE_MS = 400;

// Map markers — Airbnb drop-pin style
export const MARKER_PIN_SIZE = 48;
export const MARKER_PIN_ICON_SIZE = 18;
export const MARKER_PIN_TAIL_WIDTH = 14;
export const MARKER_PIN_TAIL_HEIGHT = 10;
export const MARKER_PILL_HEIGHT = 36;
export const MARKER_PILL_PADDING_H = 12;
export const MARKER_PILL_BORDER_RADIUS = 22;
export const MARKER_PILL_FONT_SIZE = 13;
export const MARKER_TRIANGLE_SIZE = 8;
export const MARKER_SHADOW_RADIUS = 6;
export const MARKER_SHADOW_OPACITY = 0.18;
export const MARKER_BG_DEFAULT = '#FF3B30';
export const MARKER_BG_SELECTED = '#B91C1C';
export const MARKER_TEXT_DEFAULT = '#222222';
export const MARKER_TEXT_SELECTED = '#FFFFFF';
export const MARKER_BORDER_COLOR = '#E0E0E0';
export const MARKER_BORDER_WIDTH = 1;
export const MARKER_SELECTED_SCALE = 1.08;
export const MARKER_VISITED_ACCENT = '#FFFFFF';
export const MARKER_PENDING_ACCENT = '#FFFFFF';

// Clustering
export const CLUSTER_RADIUS = 60;
export const CLUSTER_SIZE = 48;
export const CLUSTER_BORDER_WIDTH = 3;
export const CLUSTER_COLOR = '#FF3B30';
export const CLUSTER_FONT_SIZE = 16;

// User location
export const USER_DOT_COLOR = '#007AFF';
export const USER_DOT_OUTER_SIZE = 44;
export const USER_DOT_INNER_SIZE = 16;
export const USER_DOT_PULSE_SCALE = 1.3;
export const USER_DOT_PULSE_DURATION = 2000;

// FAB / map padding
export const FAB_SIZE = 56;
export const LOCATION_BUTTON_SIZE = 48;
export const FAB_BOTTOM_OFFSET = 32;

// Bottom card
export const CARD_PHOTO_HEIGHT = 200;
export const CARD_BORDER_RADIUS = 16;
export const CARD_BOTTOM_POSITION = 88;
export const CARD_HORIZONTAL_MARGIN = 16;
export const CARD_CONTENT_PADDING_H = 16;
export const CARD_CONTENT_PADDING_V = 12;

// Marker animation
export const MARKER_SPRING_TENSION = 100;
export const MARKER_SPRING_FRICTION = 8;
export const MARKER_PRESS_SCALE = 0.95;
export const MARKER_PRESS_DURATION = 150;
export const MARKER_DESELECT_DURATION = 200;

// Card animation
export const CARD_SLIDE_DURATION = 250;

// tracksViewChanges
export const TRACKS_INITIAL_MS = 1000;
export const TRACKS_CHANGE_MS = 500;

// Z-index hierarchy
export const Z_MARKER = 1;
export const Z_USER_LOCATION = 2;
export const Z_CLUSTER = 3;
export const Z_FAB = 100;
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

// Price slider
export const PRICE_VALUES = [10, 20, 35, 50, 100] as const;
export const PRICE_LABELS = ['Súper barato', 'Económico', 'Normal', 'Caro', 'Lujo'] as const;
export const PRICE_DEFAULT = 20;
export const PRICE_TRACK_COLOR = '#ef4444';

// Bottom sheet animation
export const SHEET_SPRING_TENSION = 65;
export const SHEET_SPRING_FRICTION = 11;
export const SHEET_BACKDROP_OPACITY = 0.5;
export const SHEET_DISMISS_TRANSLATE = 400;

// Drag handle
export const DRAG_HANDLE_WIDTH = 36;
export const DRAG_HANDLE_HEIGHT = 4;
export const DRAG_HANDLE_COLOR = '#DDDDDD';
export const DRAG_HANDLE_BORDER_RADIUS = 2;

// TextInput
export const INPUT_MIN_HEIGHT = 48;
export const INPUT_PLACEHOLDER_COLOR = '#A0A0A0';
export const INPUT_MULTILINE_MIN_HEIGHT = 80;

// Map card (HomeScreen redesign)
export const MAP_CARD_MARGIN_H = 16;
export const MAP_CARD_MARGIN_TOP = 12;
export const MAP_CARD_MARGIN_BOTTOM = 8;
export const MAP_CARD_BORDER_RADIUS = 16;
export const MAP_CARD_HEIGHT_PERCENT = 0.62;
export const MAP_CARD_BG = '#E8E8E8';

// Expand button
export const EXPAND_BUTTON_SIZE = 36;
export const EXPAND_BUTTON_RADIUS = 18;
