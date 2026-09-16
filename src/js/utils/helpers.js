export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function formatNumber(value) {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('es').format(value);
}

const SORT_COMPARATORS = {
  name: (a, b) => a.name.common.localeCompare(b.name.common, 'es'),
  population: (a, b) => (a.population || 0) - (b.population || 0),
  area: (a, b) => (a.area || 0) - (b.area || 0),
};

// Nunca ordena el array original: copia con spread, ordena la copia y,
// si corresponde orden descendente, la invierte con reverse().
export function sortCountries(countries, sortBy, direction) {
  const comparator = SORT_COMPARATORS[sortBy] || SORT_COMPARATORS.name;
  const sorted = [...countries].sort(comparator);
  return direction === 'desc' ? sorted.reverse() : sorted;
}
