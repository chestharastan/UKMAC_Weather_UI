import type { WeatherRecord } from "@/modules/weather/weather.types";

const SEASONAL_FORECAST_BASE_URL = "https://seasonal-api.open-meteo.com/v1/seasonal";

const SEASONAL_DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "apparent_temperature_mean",
  "precipitation_sum",
  "rain_sum",
  "precipitation_probability_max",
  "relative_humidity_2m_mean",
  "dew_point_2m_mean",
  "et0_fao_evapotranspiration",
  "vapour_pressure_deficit_max",
  "cloud_cover_mean",
  "shortwave_radiation_sum",
  "uv_index_max",
  "surface_pressure_mean",
  "wind_speed_10m_mean",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "weather_code",
].join(",");

type ApiSeasonalForecast = {
  daily: { time: string[] } & Record<string, Array<number | null>>;
};

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Fetches directly from Open-Meteo's public Seasonal Forecast API (ECMWF EC46 +
 * SEAS5, ensemble mean — the plain variable name, e.g. `temperature_2m_max`, is
 * already the 51-member ensemble mean). This is a third-party public API (CORS
 * open, no key), called directly from the browser rather than proxied through
 * our own backend.
 */
export async function getSeasonalForecast(latitude: number, longitude: number): Promise<WeatherRecord[]> {
  const query = new URLSearchParams({
    daily: SEASONAL_DAILY_VARIABLES,
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: "auto",
  });

  const response = await fetch(`${SEASONAL_FORECAST_BASE_URL}?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`Seasonal forecast request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApiSeasonalForecast;
  const { time, ...variables } = payload.daily;
  const gustRatios = time
    .map((_, index) => {
      const gust = variables.wind_gusts_10m_max?.[index];
      const maxWind = variables.wind_speed_10m_max?.[index];
      return gust !== null && gust !== undefined && maxWind ? gust / maxWind : null;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const gustMultiplier = average(gustRatios) ?? 1.8;

  function windGust(index: number) {
    const gust = variables.wind_gusts_10m_max?.[index];
    if (gust !== null && gust !== undefined) return gust;

    const maxWind = variables.wind_speed_10m_max?.[index];
    return maxWind !== null && maxWind !== undefined ? rounded(maxWind * gustMultiplier) : null;
  }

  return time.map((date, index) => ({
    apparent_temperature_max: variables.apparent_temperature_max?.[index] ?? null,
    apparent_temperature_mean: variables.apparent_temperature_mean?.[index] ?? null,
    apparent_temperature_min: variables.apparent_temperature_min?.[index] ?? null,
    cloud_cover_mean: variables.cloud_cover_mean?.[index] ?? null,
    dataType: "forecast",
    date,
    dew_point_2m_mean: variables.dew_point_2m_mean?.[index] ?? null,
    et0_fao_evapotranspiration: variables.et0_fao_evapotranspiration?.[index] ?? null,
    precipitation_probability_max: variables.precipitation_probability_max?.[index] ?? null,
    precipitation_sum: variables.precipitation_sum?.[index] ?? null,
    rain_sum: variables.rain_sum?.[index] ?? null,
    relative_humidity_2m_mean: variables.relative_humidity_2m_mean?.[index] ?? null,
    shortwave_radiation_sum: variables.shortwave_radiation_sum?.[index] ?? null,
    surface_pressure_mean: variables.surface_pressure_mean?.[index] ?? null,
    temperature_2m_max: variables.temperature_2m_max?.[index] ?? null,
    temperature_2m_min: variables.temperature_2m_min?.[index] ?? null,
    uv_index_max: variables.uv_index_max?.[index] ?? null,
    vapour_pressure_deficit_max: variables.vapour_pressure_deficit_max?.[index] ?? null,
    visibility_mean: null,
    weather_code: variables.weather_code?.[index] ?? null,
    wind_direction_10m_dominant: variables.wind_direction_10m_dominant?.[index] ?? null,
    wind_gusts_10m_max: windGust(index),
    wind_speed_10m_max: variables.wind_speed_10m_max?.[index] ?? null,
    wind_speed_10m_mean: variables.wind_speed_10m_mean?.[index] ?? null,
  }));
}

type CachedSeasonalForecast = {
  fetchedAt: string;
  records: WeatherRecord[];
};

function seasonalCacheKey(locationId: string) {
  return `weather-seasonal-outlook:${locationId}`;
}

export function getCachedSeasonalForecast(locationId: string): CachedSeasonalForecast | null {
  try {
    const raw = localStorage.getItem(seasonalCacheKey(locationId));
    return raw ? (JSON.parse(raw) as CachedSeasonalForecast) : null;
  } catch {
    return null;
  }
}

export function setCachedSeasonalForecast(locationId: string, records: WeatherRecord[]) {
  try {
    const cached: CachedSeasonalForecast = { fetchedAt: new Date().toISOString(), records };
    localStorage.setItem(seasonalCacheKey(locationId), JSON.stringify(cached));
  } catch {
    // localStorage unavailable — silently ignore, caching is a convenience only
  }
}
