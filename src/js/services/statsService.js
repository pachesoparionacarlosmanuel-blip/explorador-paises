export function computeStats(countries) {
  const totalCountries = countries.length;

  const totalPopulation = countries.reduce((sum, c) => sum + (c.population || 0), 0);
  const averagePopulation = totalCountries > 0 ? totalPopulation / totalCountries : 0;

  // País más poblado: Math.max(...array.map()) para el valor máximo, y
  // find() para localizar el país que lo tiene (ambos exigidos por el enunciado).
  const maxPopulation = totalCountries
    ? Math.max(...countries.map((c) => c.population || 0))
    : 0;

  const mostPopulated = countries.find((c) => (c.population || 0) === maxPopulation) || null;

  const hasCountryWithoutCapital = countries.some((c) => !c.capital || c.capital.length === 0);
  const allHaveCapital = totalCountries > 0 && countries.every((c) => Boolean(c.capital?.[0]));

  return {
    totalCountries,
    totalPopulation,
    averagePopulation,
    maxPopulation,
    mostPopulated,
    hasCountryWithoutCapital,
    allHaveCapital,
  };
}
