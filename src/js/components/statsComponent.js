import { computeStats } from '../services/statsService.js';
import { formatNumber } from '../utils/helpers.js';

export function renderStats(container, countries) {
  const {
    totalCountries,
    totalPopulation,
    averagePopulation,
    mostPopulated,
    hasCountryWithoutCapital,
    allHaveCapital,
  } = computeStats(countries);

  container.innerHTML = `
    <div class="stats-bar__item">
      <span class="stats-bar__value">${formatNumber(totalCountries)}</span>
      <span class="stats-bar__label">países</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${formatNumber(totalPopulation)}</span>
      <span class="stats-bar__label">población total</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${formatNumber(Math.round(averagePopulation))}</span>
      <span class="stats-bar__label">población media</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${mostPopulated ? mostPopulated.name.common : '-'}</span>
      <span class="stats-bar__label">país más poblado</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${hasCountryWithoutCapital ? 'Sí' : 'No'}</span>
      <span class="stats-bar__label">¿alguno sin capital?</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${allHaveCapital ? 'Sí' : 'No'}</span>
      <span class="stats-bar__label">¿todos tienen capital?</span>
    </div>
  `;
}
