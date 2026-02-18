// Input validation for the /api/directions endpoint.

function isValidLat(v) {
  return typeof v === 'number' && isFinite(v) && v >= -90 && v <= 90;
}

function isValidLng(v) {
  return typeof v === 'number' && isFinite(v) && v >= -180 && v <= 180;
}

function validateDirectionsBody(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object';
  }

  const { origin, destination } = body;

  if (!origin || typeof origin !== 'object') {
    return 'origin is required and must be an object with lat and lng';
  }
  if (!destination || typeof destination !== 'object') {
    return 'destination is required and must be an object with lat and lng';
  }

  if (!isValidLat(origin.lat)) {
    return 'origin.lat must be a number between -90 and 90';
  }
  if (!isValidLng(origin.lng)) {
    return 'origin.lng must be a number between -180 and 180';
  }
  if (!isValidLat(destination.lat)) {
    return 'destination.lat must be a number between -90 and 90';
  }
  if (!isValidLng(destination.lng)) {
    return 'destination.lng must be a number between -180 and 180';
  }

  return null; // valid
}

module.exports = { validateDirectionsBody };
