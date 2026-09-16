# Explorador de Países

Aplicación web en JavaScript vanilla (sin frameworks) para explorar los países del mundo: buscarlos, filtrarlos, ordenarlos, compararlos, marcarlos como favoritos y consultar el clima actual de sus capitales.

## ¿Qué hace?

- **Carga los países una sola vez**: al abrir la app se hace un único fetch inicial (`countriesApi.fetchAllCountries`) que llena un array en memoria (`state.allCountries`). Buscar, filtrar, ordenar y paginar se resuelve todo sobre ese mismo array, sin volver a consultar la red.
- **Busca por nombre** en tiempo real.
- **Filtra por región** con un `<select>` cuyas opciones se generan dinámicamente desde los propios países (`map()` + `Set` para quitar duplicados).
- **Ordena** por nombre, población o superficie, en orden ascendente o descendente (`sort()` sobre una copia del array, `reverse()` para el orden descendente — nunca se muta el array original).
- **Muestra estadísticas**: total de países visibles, población total, población media, país más poblado, si hay algún país sin capital registrada y si todos la tienen.
- **Pagina los resultados**: 20 países por página (`slice()`), con controles de navegación.
- **Detalle de país**: al hacer clic en una tarjeta se abre un modal con capital, región, población, superficie, idiomas y monedas.
- **Favoritos**: cada tarjeta tiene un botón ★ para marcar/desmarcar un país (persistido en `localStorage`), y un checkbox "Solo favoritos" filtra la lista. Se puede combinar con la búsqueda, la región y el orden al mismo tiempo.
- **Clima de los favoritos**: en cuanto hay una API key configurada y al menos un favorito, se piden en paralelo (`Promise.all`) los climas de todas las capitales favoritas y se muestran en una sección aparte. Si una petición individual falla, no rompe las demás.
- **Clima puntual en el modal**: al abrir el detalle de cualquier país (sea favorito o no) se pide su clima individualmente, como complemento.
- **Comparador**: cada tarjeta tiene un botón "Comparar" para agregar el país a una sección de comparación de hasta 3 países en simultáneo (nombre, bandera, región, capital, población y superficie). Si ya hay 3, se muestra un aviso y no se agrega un cuarto. Un mismo país no puede agregarse dos veces.

## Cómo ejecutarlo

Los módulos usan `import`/`export` de ES Modules, que los navegadores bloquean si el archivo se abre directo con `file://`. Hay que servirlo con cualquier servidor estático, por ejemplo:

```bash
# Desde la carpeta explorador-paises/
python -m http.server 8765
```

Y abrir `http://localhost:8765/` en el navegador.

### Clima (opcional)

Para ver el clima de las capitales:

1. Crea una cuenta gratuita en [openweathermap.org](https://openweathermap.org/api) y genera una API key.
2. Pégala en el campo "API key clima" del header y pulsa "Guardar". Se guarda en `localStorage` del navegador.

Sin API key, la app funciona igual, solo que no se muestra el clima.

## Fuentes de datos

| Dato | Fuente |
| --- | --- |
| Países (nombre, capital, región, superficie, población, banderas, idiomas, monedas, coordenadas) | [RestCountries v3.1](https://restcountries.com) — `https://restcountries.com/v3.1/all`, tal como pide el enunciado. |
| Clima | [OpenWeatherMap](https://openweathermap.org/api) — requiere API key propia del usuario. |

`countriesApi.js` hace **un solo fetch** al iniciar: primero intenta `https://restcountries.com/v3.1/all` y, si falla, reintenta con la URL de respaldo del propio enunciado (`.../all?fields=name,flags,capital,population,cca3`, que no trae `region` ni `area`). Si ambas fallan, se lanza un error y la app queda en el estado de error (sin datos), sin ninguna fuente alternativa silenciosa — así se decidió deliberadamente, para ajustarse de forma literal al enunciado.

> **⚠️ Estado conocido de la API (verificado en vivo, no algo que dependa del código):** al momento de escribir esto, **ambas URLs de RestCountries devuelven un error de deprecación** — responden HTTP 200 pero con el cuerpo `{"success": false, "errors": [{"message": "This API version has been deprecated..."}]}` en vez de un array de países. Se confirmó con `curl` directo contra el servidor, no es un problema de CORS ni de este proyecto. Su reemplazo (`api.restcountries.com`, v5) exige una API key de pago. Mientras esa situación no cambie, la app mostrará el estado de error al cargar y no tendrá países para mostrar; en cuanto RestCountries vuelva a responder con datos, funcionará sin cambiar nada de código.

## Estructura del proyecto

```
explorador-paises/
├── index.html                 # Estructura de la interfaz
├── assets/css/styles.css      # Estilos visuales
└── src/js/
    ├── app.js                 # Coordina toda la aplicación (eventos, pipeline, render)
    ├── state.js                # Estado global de la app (patrón pub-sub simple)
    ├── api/
    │   ├── countriesApi.js     # Obtiene y normaliza la lista de países (una sola vez)
    │   └── weatherApi.js       # Clima individual y fetchWeatherForCountries (Promise.all)
    ├── services/
    │   ├── storageService.js   # localStorage: favoritos (con spread) y API key
    │   └── statsService.js     # Estadísticas (reduce, Math.max + find, some, every)
    ├── components/
    │   ├── cardComponent.js        # Tarjetas de país + botones de favorito y comparar (map + join)
    │   ├── statsComponent.js       # Renderiza la barra de estadísticas
    │   └── paginationComponent.js  # Pagina (slice) y renderiza controles (sin bucles for)
    └── utils/
        └── helpers.js          # debounce, formatNumber, sortCountries (sort + reverse)
```

## Flujo de la aplicación

1. `app.js` pide los países **una sola vez** (`countriesApi.fetchAllCountries`) y los guarda en `state.allCountries`. No hay caché ni una segunda consulta mientras el usuario interactúa.
2. Cada cambio de estado (`setState`) dispara `render()`, que ejecuta el pipeline central `getProcessedCountries(state)`:
   - parte de `state.allCountries` (sin mutarlo),
   - aplica búsqueda (`filter`), luego región (`filter`), luego favoritos (`filter`),
   - ordena el resultado (`sortCountries`: copia con spread, `sort()`, `reverse()` si es descendente).
3. El array procesado se pagina con `slice()` (`paginationComponent.getPageItems`) y se dibuja con `map().join('')` (`cardComponent.renderCountryCards`).
4. Cualquier cambio en búsqueda, región, orden o el toggle de favoritos reinicia `currentPage` a 1.
5. Los clics se manejan por **delegación de eventos** en el contenedor de la grilla: clic en la tarjeta abre el modal; clic en ★ alterna el favorito (`localStorage`, con spread `[...favoritos, code]`); clic en "Comparar" agrega/quita del comparador (máx. 3, sin duplicados vía `includes()`).
6. Al agregar o quitar un favorito (o guardar la API key), se vuelve a pedir el clima de **todos** los favoritos en paralelo con `Promise.all` (`refreshFavoritesWeather`); si una petición individual falla, se descarta sola y no afecta a las demás.
7. El modal de detalle reutiliza el clima ya cacheado en memoria si existe; si no, lo pide puntualmente al abrirse.


ENUNCIADO DEL PROYECTO:
Indicaciones de la tarea
"Explorador de Países", el eje central es el manejo de arrays y sus métodos.

Al arrancar, cargar https://restcountries.com/v3.1/all y guardar el resultado en un array en memoria (let paises = []). Todo lo demás se hace sobre ese array, sin volver a pedir datos.
Buscador que filtra con filter() + includes() sobre el nombre.
Filtro por región (Europe, Asia, Africa…) generando las opciones del <select> dinámicamente con map() y eliminando repetidos con Set o reduce().
Ordenar la lista por nombre, población o superficie con sort() y un botón asc/desc (reverse()).
Panel de estadísticas calculado con:
reduce() → población total y media
Math.max(...array.map()) → país más poblado
some() / every() → "¿hay algún país sin capital?"
find() → obtener el país al hacer clic en una tarjeta
Favoritos como array en localStorage: añadir con spread [...favs, code], quitar con filter(), comprobar con includes(), serializar con JSON.stringify.
Comparador: array de hasta 3 países seleccionados; si ya hay 3, avisar y no añadir más.
Requisitos técnicos añadidos
Prohibido usar bucles for clásicos: solo métodos de array (map, filter, reduce, find, some, every, sort, forEach).
No mutar el array original: encadenar métodos y trabajar sobre copias ([...paises] antes de sort(), que sí muta).
Renderizar la lista con map().join('') o creando nodos y usando append(...nodos).
Paginación: mostrar 20 resultados por página usando slice().
Promise.all sobre un array de peticiones para traer el clima de los países favoritos a la vez. En caso no les funcione el api rescountries Usar https://restcountries.com/v3.1/all?fields=name,flags,capital,population,cca3
const res = await fetch(
 'https://restcountries.com/v3.1/all?fields=name,flags,capital,population,cca3'
);
const paises = await res.json();
Rúbrica ajustada
| Criterio | Peso |
|---|---|
| Uso correcto de métodos de array (map/filter/reduce/sort/find) | 35% |
| Inmutabilidad y encadenamiento sin for | 15% |
| Consumo de APIs y manejo de errores | 20% |
| Favoritos y paginación con arrays | 15% |
| Interfaz y estados de carga | 15% |
Reto extra: que filtro + orden + búsqueda + paginación funcionen combinados en una sola cadena de transformaciones sobre el array original, sin variables globales intermedias.