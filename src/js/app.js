import { getState, setState, subscribe } from './state.js';
import { fetchAllCountries } from './api/countriesApi.js';
import { fetchWeatherByCoords, fetchWeatherForCountries } from './api/weatherApi.js';
import {
  getWeatherApiKey,
  setWeatherApiKey,
  getFavorites,
  toggleFavorite,
} from './services/storageService.js';
import { renderCountryCards } from './components/cardComponent.js';
import { renderStats } from './components/statsComponent.js';
import { renderPagination, getTotalPages, getPageItems } from './components/paginationComponent.js';
import { debounce, formatNumber, sortCountries } from './utils/helpers.js';

const elements = {
  grid: document.getElementById('countries-grid'),
  stats: document.getElementById('stats-bar'),
  pagination: document.getElementById('pagination'),
  searchInput: document.getElementById('search-input'),
  regionFilter: document.getElementById('region-filter'),
  sortBy: document.getElementById('sort-by'),
  sortDirectionBtn: document.getElementById('sort-direction'),
  favoritesToggle: document.getElementById('favorites-toggle'),
  loading: document.getElementById('loading-indicator'),
  errorBox: document.getElementById('error-box'),
  favoritesWeatherGrid: document.getElementById('favorites-weather-grid'),
  compareGrid: document.getElementById('compare-grid'),
  compareMessage: document.getElementById('compare-message'),
  modal: document.getElementById('country-modal'),
  modalBody: document.getElementById('country-modal-body'),
  modalClose: document.getElementById('country-modal-close'),
  apiKeyForm: document.getElementById('api-key-form'),
  apiKeyInput: document.getElementById('api-key-input'),
};

let compareMessageTimeout;

async function init() {
  elements.apiKeyInput.value = getWeatherApiKey();
  setState({ favorites: getFavorites() });

  elements.searchInput.addEventListener('input', debounce(handleSearch, 150));
  elements.regionFilter.addEventListener('change', handleRegionChange);
  elements.sortBy.addEventListener('change', handleSortByChange);
  elements.sortDirectionBtn.addEventListener('click', handleSortDirectionToggle);
  elements.favoritesToggle.addEventListener('change', handleFavoritesToggle);
  elements.grid.addEventListener('click', handleGridClick);
  elements.grid.addEventListener('keydown', handleGridKeydown);
  elements.compareGrid.addEventListener('click', handleCompareGridClick);
  elements.modalClose.addEventListener('click', closeModal);
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modal.hidden) closeModal();
  });
  elements.apiKeyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setWeatherApiKey(elements.apiKeyInput.value.trim());
    setState({ weatherMap: new Map() });
    refreshFavoritesWeather();
    elements.apiKeyForm.classList.add('api-key-form--saved');
    setTimeout(() => elements.apiKeyForm.classList.remove('api-key-form--saved'), 1500);
  });

  subscribe(render);

  await loadCountries();
}

// Un solo fetch inicial: de acá en adelante toda búsqueda, filtro, orden y
// paginación se resuelve sobre este mismo array en memoria (state.allCountries),
// sin volver a golpear la red.
async function loadCountries() {
  setState({ loading: true, error: null });

  try {
    const countries = await fetchAllCountries();
    setState({ allCountries: countries, loading: false });
    populateRegionFilter(countries);
    refreshFavoritesWeather();
  } catch (err) {
    setState({ loading: false, error: err.message });
  }
}

function populateRegionFilter(countries) {
  const regions = [...new Set(countries.map((country) => country.region).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'es')
  );

  const optionsHtml = ['<option value="">Todas las regiones</option>']
    .concat(regions.map((region) => `<option value="${region}">${region}</option>`))
    .join('');

  elements.regionFilter.innerHTML = optionsHtml;
}

// Pipeline central: una sola cadena de transformaciones sobre state.allCountries
// (búsqueda -> región -> favoritos -> orden), sin variables intermedias y sin
// mutar el array original. El resultado se pagina (slice) y se renderiza
// (map + join) más abajo, en render().
function getProcessedCountries(state) {
  const term = state.searchTerm.trim().toLowerCase();

  return sortCountries(
    state.allCountries
      .filter((country) => !term || country.name.common.toLowerCase().includes(term))
      .filter((country) => !state.regionFilter || country.region === state.regionFilter)
      .filter(
        (country) => !state.showFavoritesOnly || state.favorites.includes(country.cca3)
      ),
    state.sortBy,
    state.sortDirection
  );
}

function handleSearch(event) {
  setState({ searchTerm: event.target.value, currentPage: 1 });
}

function handleRegionChange(event) {
  setState({ regionFilter: event.target.value, currentPage: 1 });
}

function handleSortByChange(event) {
  setState({ sortBy: event.target.value, currentPage: 1 });
}

function handleSortDirectionToggle() {
  const next = getState().sortDirection === 'asc' ? 'desc' : 'asc';
  setState({ sortDirection: next, currentPage: 1 });
}

function handleFavoritesToggle(event) {
  setState({ showFavoritesOnly: event.target.checked, currentPage: 1 });
}

function handlePageChange(page) {
  setState({ currentPage: page });
  elements.grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleGridClick(event) {
  const favBtn = event.target.closest('[data-fav-toggle]');
  if (favBtn) {
    event.stopPropagation();
    const favorites = toggleFavorite(favBtn.dataset.code);
    setState({ favorites });
    refreshFavoritesWeather();
    return;
  }

  const compareBtn = event.target.closest('[data-compare-toggle]');
  if (compareBtn) {
    event.stopPropagation();
    toggleCompare(compareBtn.dataset.code);
    return;
  }

  const card = event.target.closest('.country-card');
  if (card) selectCountryByCode(card.dataset.code);
}

function handleGridKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('.country-card');
  if (!card) return;
  event.preventDefault();
  selectCountryByCode(card.dataset.code);
}

function handleCompareGridClick(event) {
  const removeBtn = event.target.closest('[data-compare-remove]');
  if (!removeBtn) return;
  const code = removeBtn.dataset.code;
  setState({ compareList: getState().compareList.filter((c) => c !== code) });
}

function toggleCompare(code) {
  const { compareList } = getState();

  if (compareList.includes(code)) {
    setState({ compareList: compareList.filter((c) => c !== code) });
    return;
  }

  if (compareList.length >= 3) {
    showCompareMessage('Ya tienes 3 países en el comparador. Quita uno para agregar otro.');
    return;
  }

  setState({ compareList: [...compareList, code] });
}

function showCompareMessage(text) {
  elements.compareMessage.textContent = text;
  elements.compareMessage.hidden = false;
  clearTimeout(compareMessageTimeout);
  compareMessageTimeout = setTimeout(() => {
    elements.compareMessage.hidden = true;
  }, 2500);
}

function selectCountryByCode(code) {
  const country = getState().allCountries.find((c) => c.cca3 === code);
  if (country) handleSelectCountry(country);
}

async function handleSelectCountry(country) {
  setState({ selectedCountry: country });
  openModal(country);

  const cachedWeather = getState().weatherMap.get(country.cca3);
  if (cachedWeather) {
    renderModalWeather(cachedWeather);
    return;
  }

  const apiKey = getWeatherApiKey();
  const [lat, lon] = country.latlng || [];
  if (!apiKey || lat === undefined) return;

  try {
    const weather = await fetchWeatherByCoords(lat, lon, apiKey);
    const merged = new Map(getState().weatherMap);
    merged.set(country.cca3, weather);
    setState({ weatherMap: merged });
    renderModalWeather(weather);
  } catch (err) {
    renderModalWeatherError(err.message);
  }
}

// Trae el clima de todos los países favoritos a la vez: arma las peticiones
// con map() y las ejecuta en paralelo con Promise.all() (dentro de
// fetchWeatherForCountries). Si una falla, no rompe el resto: queda fuera
// del Map resultante y ese favorito simplemente se muestra sin clima.
async function refreshFavoritesWeather() {
  const apiKey = getWeatherApiKey();
  const { favorites, allCountries } = getState();

  if (!apiKey || favorites.length === 0) {
    setState({ favoritesWeather: new Map() });
    return;
  }

  const favoriteCountries = favorites
    .map((code) => allCountries.find((c) => c.cca3 === code))
    .filter(Boolean);

  try {
    const weatherMap = await fetchWeatherForCountries(favoriteCountries, apiKey);
    setState({ favoritesWeather: weatherMap });
  } catch {
    setState({ favoritesWeather: new Map() });
  }
}

function render(state) {
  elements.loading.hidden = !state.loading;
  elements.errorBox.hidden = !state.error;
  elements.errorBox.textContent = state.error || '';

  elements.sortDirectionBtn.textContent =
    state.sortDirection === 'asc' ? '↑ Ascendente' : '↓ Descendente';
  elements.sortDirectionBtn.setAttribute('aria-pressed', String(state.sortDirection === 'desc'));

  // paises -> filter (búsqueda) -> filter (región) -> filter (favoritos)
  //        -> sort() -> reverse() si corresponde   [getProcessedCountries]
  //        -> slice() para la página actual         [getPageItems]
  //        -> map().join() para pintar las tarjetas  [renderCountryCards]
  const processed = getProcessedCountries(state);
  renderStats(elements.stats, processed);

  const totalPages = getTotalPages(processed, state.pageSize);
  const page = Math.min(state.currentPage, totalPages);
  const pageItems = getPageItems(processed, page, state.pageSize);

  if (!state.loading && pageItems.length === 0 && !state.error) {
    elements.grid.innerHTML = '<p class="empty-message">No se encontraron países.</p>';
  } else {
    elements.grid.innerHTML = renderCountryCards(pageItems, {
      favorites: state.favorites,
      compareList: state.compareList,
    });
  }

  renderPagination(elements.pagination, { currentPage: page, totalPages }, handlePageChange);

  renderFavoritesWeather(state);
  renderComparator(state);
}

function renderFavoritesWeather(state) {
  const favoriteCountries = state.favorites
    .map((code) => state.allCountries.find((c) => c.cca3 === code))
    .filter(Boolean);

  if (!getWeatherApiKey()) {
    elements.favoritesWeatherGrid.innerHTML =
      '<p class="empty-message">Configura tu API key de OpenWeatherMap para ver el clima de tus favoritos.</p>';
    return;
  }

  if (favoriteCountries.length === 0) {
    elements.favoritesWeatherGrid.innerHTML =
      '<p class="empty-message">Marca países con ★ para ver aquí el clima de sus capitales.</p>';
    return;
  }

  elements.favoritesWeatherGrid.innerHTML = favoriteCountries
    .map((country) => {
      const weather = state.favoritesWeather.get(country.cca3);
      const body = weather
        ? `<span class="favorite-weather__temp">${Math.round(weather.main?.temp)}°C</span>
           <span class="favorite-weather__desc">${weather.weather?.[0]?.description ?? ''}</span>`
        : '<span class="favorite-weather__desc">Sin datos de clima</span>';

      return `
        <article class="favorite-weather">
          <img src="${country.flags?.png || ''}" alt="Bandera de ${country.name.common}" />
          <div class="favorite-weather__body">
            <strong>${country.name.common}</strong>
            ${body}
          </div>
        </article>
      `;
    })
    .join('');
}

function renderComparator(state) {
  const countries = state.compareList
    .map((code) => state.allCountries.find((c) => c.cca3 === code))
    .filter(Boolean);

  if (countries.length === 0) {
    elements.compareGrid.innerHTML =
      '<p class="empty-message">Agrega hasta 3 países desde sus tarjetas para compararlos.</p>';
    return;
  }

  elements.compareGrid.innerHTML = countries
    .map(
      (country) => `
        <article class="compare-card">
          <button type="button" class="compare-card__remove" data-compare-remove data-code="${country.cca3}" aria-label="Quitar del comparador">✕</button>
          <img class="compare-card__flag" src="${country.flags?.png || ''}" alt="Bandera de ${country.name.common}" />
          <h3>${country.name.common}</h3>
          <ul>
            <li><strong>Región:</strong> ${country.region || '-'}</li>
            <li><strong>Capital:</strong> ${country.capital?.[0] || '-'}</li>
            <li><strong>Población:</strong> ${formatNumber(country.population)}</li>
            <li><strong>Superficie:</strong> ${formatNumber(country.area)} km²</li>
          </ul>
        </article>
      `
    )
    .join('');
}

function openModal(country) {
  const capital = country.capital?.[0] || 'Sin capital';
  const languages = country.languages ? Object.values(country.languages).join(', ') : '-';
  const currencies = country.currencies
    ? Object.values(country.currencies)
        .map((c) => `${c.name} (${c.symbol || ''})`)
        .join(', ')
    : '-';

  elements.modalBody.innerHTML = `
    <img class="modal-flag" src="${country.flags?.png || ''}" alt="Bandera de ${country.name.common}" />
    <h2>${country.name.common}</h2>
    <p class="modal-official-name">${country.name.official}</p>
    <ul class="modal-details">
      <li><strong>Capital:</strong> ${capital}</li>
      <li><strong>Región:</strong> ${country.region || '-'} ${country.subregion ? `(${country.subregion})` : ''}</li>
      <li><strong>Población:</strong> ${formatNumber(country.population)}</li>
      <li><strong>Superficie:</strong> ${formatNumber(country.area)} km²</li>
      <li><strong>Idiomas:</strong> ${languages}</li>
      <li><strong>Monedas:</strong> ${currencies}</li>
    </ul>
    <div id="modal-weather" class="modal-weather">
      ${getWeatherApiKey() ? 'Cargando clima…' : 'Configura tu API key de OpenWeatherMap para ver el clima.'}
    </div>
  `;
  elements.modal.hidden = false;
  document.body.classList.add('modal-open');
}

function renderModalWeather(weather) {
  const box = document.getElementById('modal-weather');
  if (!box) return;

  const temp = Math.round(weather.main?.temp);
  const description = weather.weather?.[0]?.description ?? '';
  const icon = weather.weather?.[0]?.icon;

  box.innerHTML = `
    ${icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" class="modal-weather__icon" />` : ''}
    <span class="modal-weather__temp">${temp}°C</span>
    <span class="modal-weather__desc">${description}</span>
  `;
}

function renderModalWeatherError(message) {
  const box = document.getElementById('modal-weather');
  if (!box) return;
  box.textContent = `No se pudo obtener el clima: ${message}`;
}

function closeModal() {
  elements.modal.hidden = true;
  document.body.classList.remove('modal-open');
  setState({ selectedCountry: null });
}

init();
