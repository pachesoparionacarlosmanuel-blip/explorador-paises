const state = {
  allCountries: [],
  favorites: [],
  compareList: [],
  weatherMap: new Map(),
  favoritesWeather: new Map(),
  currentPage: 1,
  pageSize: 20,
  searchTerm: '',
  regionFilter: '',
  sortBy: 'name',
  sortDirection: 'asc',
  showFavoritesOnly: false,
  selectedCountry: null,
  loading: false,
  error: null,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
