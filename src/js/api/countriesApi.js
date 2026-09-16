const PRIMARY_URL = 'https://restcountries.com/v3.1/all';
const FALLBACK_URL = 'https://restcountries.com/v3.1/all?fields=name,flags,capital,population,cca3';

function normalizeCountry(country) {
  return {
    cca3: country.cca3,
    name: { common: country.name?.common ?? '', official: country.name?.official ?? '' },
    capital: country.capital || [],
    region: country.region || '',
    subregion: country.subregion || '',
    population: country.population || 0,
    area: country.area || 0,
    flags: { png: country.flags?.png || '', svg: country.flags?.svg || '' },
    latlng: country.latlng || [],
    languages: country.languages || {},
    currencies: country.currencies || {},
  };
}

async function fetchCountriesFrom(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(data?.errors?.[0]?.message || 'Respuesta inesperada de RestCountries');
  }

  return data.map(normalizeCountry);
}

// Dataset local usado únicamente si RestCountries no responde (ver README:
// la API pública quedó deprecada). Trae los mismos campos que normalizeCountry
// espera, para que el resto de la app (stats, tarjetas, comparador) funcione igual.
const LOCAL_FALLBACK_URL = new URL('../../data/countries-fallback.json', import.meta.url);

// Un solo fetch inicial: se intenta la URL principal de RestCountries y, si
// falla, la URL de respaldo indicada por el enunciado (con menos campos, ya
// que "region"/"area" no vienen ahí). Si ambas fallan (p. ej. la API sigue
// deprecada), se usa el dataset local como último recurso. A partir de acá el
// resultado queda en memoria (state.allCountries) y no se vuelve a pedir nada
// a la API mientras el usuario busca, filtra, ordena o pagina.
export async function fetchAllCountries() {
  try {
    return await fetchCountriesFrom(PRIMARY_URL);
  } catch (primaryError) {
    try {
      return await fetchCountriesFrom(FALLBACK_URL);
    } catch (fallbackError) {
      try {
        return await fetchCountriesFrom(LOCAL_FALLBACK_URL);
      } catch (localError) {
        throw new Error(
          `No se pudo obtener la lista de países desde RestCountries (${fallbackError.message}).`
        );
      }
    }
  }
}
