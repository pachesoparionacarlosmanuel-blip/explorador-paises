const KEYS = {
  API_KEY: 'explorador_paises_weather_api_key',
  FAVORITES: 'explorador_paises_favorites',
};

// --- API key del servicio de clima ---

export function getWeatherApiKey() {
  return localStorage.getItem(KEYS.API_KEY) || '';
}

export function setWeatherApiKey(key) {
  localStorage.setItem(KEYS.API_KEY, key);
}

// --- Favoritos (guardar, obtener y eliminar en localStorage) ---

export function getFavorites() {
  const raw = localStorage.getItem(KEYS.FAVORITES);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavorite(code) {
  return getFavorites().includes(code);
}

export function addFavorite(code) {
  const favorites = getFavorites();
  if (favorites.includes(code)) return favorites;

  const updated = [...favorites, code];
  localStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

export function removeFavorite(code) {
  const updated = getFavorites().filter((favCode) => favCode !== code);
  localStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

export function toggleFavorite(code) {
  return isFavorite(code) ? removeFavorite(code) : addFavorite(code);
}
