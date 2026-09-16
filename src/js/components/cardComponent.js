import { formatNumber } from '../utils/helpers.js';

function countryCardTemplate(country, { isFavorite, isComparing, compareDisabled }) {
  const flagUrl = country.flags?.png || country.flags?.svg || '';
  const capital = country.capital?.[0] || 'Sin capital';
  const compareBlocked = !isComparing && compareDisabled;

  return `
    <article class="country-card" data-code="${country.cca3}" tabindex="0">
      <div class="country-card__flag-wrap">
        <img class="country-card__flag" src="${flagUrl}" alt="Bandera de ${country.name.common}" loading="lazy" />
        <button
          type="button"
          class="country-card__fav ${isFavorite ? 'country-card__fav--active' : ''}"
          data-fav-toggle
          data-code="${country.cca3}"
          aria-label="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
        >${isFavorite ? '★' : '☆'}</button>
      </div>
      <div class="country-card__body">
        <h3 class="country-card__name">${country.name.common}</h3>
        <p class="country-card__info"><strong>Capital:</strong> ${capital}</p>
        <p class="country-card__info"><strong>Región:</strong> ${country.region || '-'}</p>
        <p class="country-card__info"><strong>Población:</strong> ${formatNumber(country.population)}</p>
        <p class="country-card__info"><strong>Superficie:</strong> ${formatNumber(country.area)} km²</p>
        <button
          type="button"
          class="country-card__compare ${isComparing ? 'country-card__compare--active' : ''}"
          data-compare-toggle
          data-code="${country.cca3}"
          ${compareBlocked ? 'disabled' : ''}
        >${isComparing ? 'Quitar de comparar' : 'Comparar'}</button>
      </div>
    </article>
  `;
}

export function renderCountryCards(countries, { favorites, compareList }) {
  return countries
    .map((country) =>
      countryCardTemplate(country, {
        isFavorite: favorites.includes(country.cca3),
        isComparing: compareList.includes(country.cca3),
        compareDisabled: compareList.length >= 3,
      })
    )
    .join('');
}
