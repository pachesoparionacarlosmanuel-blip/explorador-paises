const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export async function fetchWeatherByCoords(lat, lon, apiKey) {
  if (!apiKey) throw new Error('Falta configurar la API key de OpenWeatherMap');
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al obtener el clima (${res.status})`);
  return res.json();
}

// Obtiene el clima de varios países en paralelo. Los que fallan (sin
// coordenadas o error de red) simplemente quedan fuera del Map resultante.
export async function fetchWeatherForCountries(countries, apiKey) {
  if (!apiKey || countries.length === 0) return new Map();

  const entries = await Promise.all(
    countries.map(async (country) => {
      const [lat, lon] = country.latlng || [];
      if (lat === undefined || lon === undefined) return [country.cca3, null];

      try {
        const weather = await fetchWeatherByCoords(lat, lon, apiKey);
        return [country.cca3, weather];
      } catch {
        return [country.cca3, null];
      }
    })
  );

  return new Map(entries.filter(([, weather]) => weather !== null));
}
