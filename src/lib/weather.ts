import type { SyncResult, WeatherDashboard, WeatherHourlyForecast, WeatherRecord } from "@/modules/weather/weather.types";

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const CUSTOM_LOCATIONS_KEY = "weather-custom-locations";

export type WeatherLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
};

export type WeatherLocationInput = {
  name: string;
  latitude: number;
  longitude: number;
};

export type CurrentWeather = {
  apparentTemperature: number | null;
  precipitation: number | null;
  rain: number | null;
  relativeHumidity: number | null;
  temperature: number | null;
  time: string | null;
  weatherCode: number | null;
  weatherLabel: string | null;
  windDirection: number | null;
  windSpeed: number | null;
};

export type DailyWeather = {
  date: string;
  precipitationProbabilityMax: number | null;
  rainSum: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  uvIndexMax: number | null;
  weatherCode: number | null;
  weatherLabel: string | null;
  windSpeedMax: number | null;
};

export type WeatherReport = {
  current: CurrentWeather;
  daily: DailyWeather[];
  location: WeatherLocation;
  provider: string;
  timezone: string;
  units: Record<string, string>;
  warning?: string | null;
};

export type WeatherResponse = {
  generatedAt: string;
  weather: WeatherReport[];
};

type ApiDaily = { time?: string[] } & Record<string, Array<number | null> | string[] | undefined>;
type ApiHourly = { time?: string[] } & Record<string, Array<number | null> | string[] | undefined>;
type ApiCurrent = Record<string, number | string | null | undefined>;
type OpenMeteoPayload = {
  current?: ApiCurrent;
  current_units?: Record<string, string>;
  daily?: ApiDaily;
  daily_units?: Record<string, string>;
  hourly?: ApiHourly;
  timezone?: string;
};
type WeatherNumericKey = Exclude<keyof WeatherRecord, "dataType" | "date">;

export const SAVED_LOCATIONS: WeatherLocation[] = [
  {
    id: "siem-reap",
    name: "Siem Reap",
    latitude: 13.366865,
    longitude: 103.953823,
    createdAt: "2026-09-04T05:06:00.424477+00:00",
    updatedAt: "2026-09-04T05:06:00.424477+00:00",
  },
  {
    id: "streng-treng",
    name: "Stung Treng",
    latitude: 13.685107,
    longitude: 106.208278,
    createdAt: "2026-09-04T05:00:26.215418+00:00",
    updatedAt: "2026-09-04T05:00:26.215418+00:00",
  },
  {
    id: "pursat",
    name: "Pursat",
    latitude: 12.140874,
    longitude: 104.084852,
    createdAt: "2026-09-04T05:00:26.222630+00:00",
    updatedAt: "2026-09-04T05:00:26.222630+00:00",
  },
];

const HOURLY_MEAN_FIELDS: Record<string, WeatherNumericKey> = {
  apparent_temperature: "apparent_temperature_mean",
  cloud_cover: "cloud_cover_mean",
  dew_point_2m: "dew_point_2m_mean",
  relative_humidity_2m: "relative_humidity_2m_mean",
  surface_pressure: "surface_pressure_mean",
  visibility: "visibility_mean",
  wind_speed_10m: "wind_speed_10m_mean",
};

const HOURLY_MAX_FIELDS: Record<string, WeatherNumericKey> = {
  vapour_pressure_deficit: "vapour_pressure_deficit_max",
};

const FORECAST_HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "weather_code",
  "surface_pressure",
  "cloud_cover",
  "visibility",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "vapour_pressure_deficit",
].join(",");

const FORECAST_DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "rain_sum",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "et0_fao_evapotranspiration",
  "uv_index_max",
].join(",");

const ARCHIVE_HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "weather_code",
  "surface_pressure",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "vapour_pressure_deficit",
].join(",");

const ARCHIVE_DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "rain_sum",
  "precipitation_sum",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "et0_fao_evapotranspiration",
].join(",");

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function getNumberList(payload: ApiDaily | ApiHourly | undefined, field: string): Array<number | null> {
  const values = payload?.[field];
  return Array.isArray(values) ? (values as Array<number | null>) : [];
}

function getStringList(payload: ApiDaily | ApiHourly | undefined, field: string): string[] {
  const values = payload?.[field];
  return Array.isArray(values) ? (values as string[]) : [];
}

function dailyValue(payload: ApiDaily | undefined, field: string, index: number) {
  const values = getNumberList(payload, field);
  return values[index] ?? null;
}

function mean(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return present.length ? present.reduce((total, value) => total + value, 0) / present.length : null;
}

function max(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return present.length ? Math.max(...present) : null;
}

function aggregateDailyFromHourly(hourly: ApiHourly | undefined) {
  const times = getStringList(hourly, "time");
  const grouped: Record<string, Record<string, Array<number | null>>> = {};

  times.forEach((timestamp, index) => {
    const date = timestamp.slice(0, 10);
    const bucket = (grouped[date] ??= {});
    for (const field of [...Object.keys(HOURLY_MEAN_FIELDS), ...Object.keys(HOURLY_MAX_FIELDS)]) {
      const values = getNumberList(hourly, field);
      if (values.length) {
        (bucket[field] ??= []).push(values[index] ?? null);
      }
    }
  });

  return Object.fromEntries(
    Object.entries(grouped).map(([date, fields]) => {
      const aggregated: Partial<Record<WeatherNumericKey, number | null>> = {};
      for (const [sourceField, targetField] of Object.entries(HOURLY_MEAN_FIELDS)) {
        aggregated[targetField] = mean(fields[sourceField] ?? []);
      }
      for (const [sourceField, targetField] of Object.entries(HOURLY_MAX_FIELDS)) {
        aggregated[targetField] = max(fields[sourceField] ?? []);
      }
      return [date, aggregated];
    }),
  );
}

function emptyRecord(date: string, today: string): WeatherRecord {
  return {
    apparent_temperature_max: null,
    apparent_temperature_mean: null,
    apparent_temperature_min: null,
    cloud_cover_mean: null,
    dataType: date < today ? "historical" : "forecast",
    date,
    dew_point_2m_mean: null,
    et0_fao_evapotranspiration: null,
    precipitation_probability_max: null,
    precipitation_sum: null,
    rain_sum: null,
    relative_humidity_2m_mean: null,
    shortwave_radiation_sum: null,
    surface_pressure_mean: null,
    temperature_2m_max: null,
    temperature_2m_min: null,
    uv_index_max: null,
    vapour_pressure_deficit_max: null,
    visibility_mean: null,
    weather_code: null,
    wind_direction_10m_dominant: null,
    wind_gusts_10m_max: null,
    wind_speed_10m_max: null,
    wind_speed_10m_mean: null,
  };
}

function recordsFromPayload(payload: OpenMeteoPayload, today: string) {
  const daily = payload.daily;
  const hourlyAggregates = aggregateDailyFromHourly(payload.hourly);
  return getStringList(daily, "time")
    .map((date, index) => ({
      ...emptyRecord(date, today),
      apparent_temperature_max: dailyValue(daily, "apparent_temperature_max", index),
      apparent_temperature_min: dailyValue(daily, "apparent_temperature_min", index),
      et0_fao_evapotranspiration: dailyValue(daily, "et0_fao_evapotranspiration", index),
      precipitation_probability_max: dailyValue(daily, "precipitation_probability_max", index),
      precipitation_sum: dailyValue(daily, "precipitation_sum", index),
      rain_sum: dailyValue(daily, "rain_sum", index),
      shortwave_radiation_sum: dailyValue(daily, "shortwave_radiation_sum", index),
      temperature_2m_max: dailyValue(daily, "temperature_2m_max", index),
      temperature_2m_min: dailyValue(daily, "temperature_2m_min", index),
      uv_index_max: dailyValue(daily, "uv_index_max", index),
      weather_code: dailyValue(daily, "weather_code", index),
      wind_direction_10m_dominant: dailyValue(daily, "wind_direction_10m_dominant", index),
      wind_gusts_10m_max: dailyValue(daily, "wind_gusts_10m_max", index),
      wind_speed_10m_max: dailyValue(daily, "wind_speed_10m_max", index),
      ...hourlyAggregates[date],
    }))
    .filter((record) => Object.entries(record).some(([key, value]) => key !== "date" && key !== "dataType" && value !== null));
}

async function fetchOpenMeteo(url: string, params: Record<string, string | number>) {
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]));
  const response = await fetch(`${url}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Weather request failed with status ${response.status}`);
  }
  return (await response.json()) as OpenMeteoPayload;
}

function weatherCodeLabel(code: number | null | undefined) {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2 || code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return "Snow";
  if ([95, 96, 99].includes(code ?? -1)) return "Storm";
  return "Mixed";
}

function readCustomLocations(): WeatherLocation[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LOCATIONS_KEY);
    return raw ? (JSON.parse(raw) as WeatherLocation[]) : [];
  } catch {
    return [];
  }
}

function writeCustomLocations(locations: WeatherLocation[]) {
  try {
    localStorage.setItem(CUSTOM_LOCATIONS_KEY, JSON.stringify(locations));
  } catch {
    // localStorage unavailable, ignore.
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listWeatherLocations() {
  return [...SAVED_LOCATIONS, ...readCustomLocations()];
}

export async function createWeatherLocation(input: WeatherLocationInput) {
  const now = new Date().toISOString();
  const location: WeatherLocation = {
    ...input,
    createdAt: now,
    id: slugify(input.name) || `location-${Date.now()}`,
    updatedAt: now,
  };
  const locations = [location, ...readCustomLocations().filter((item) => item.id !== location.id)];
  writeCustomLocations(locations);
  return location;
}

export async function updateWeatherLocation(id: string, input: WeatherLocationInput) {
  const locations = readCustomLocations();
  const existing = locations.find((location) => location.id === id);
  if (!existing) {
    throw new Error("Only custom browser-saved locations can be edited.");
  }
  const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
  writeCustomLocations(locations.map((location) => (location.id === id ? updated : location)));
  return updated;
}

export async function deleteWeatherLocation(id: string) {
  writeCustomLocations(readCustomLocations().filter((location) => location.id !== id));
  return null;
}

export async function getWeather(params: { days: number; location?: string }): Promise<WeatherResponse> {
  const locations = await listWeatherLocations();
  const selected = params.location ? locations.filter((location) => location.id === params.location) : locations;

  const reports = await Promise.all(
    selected.map(async (location) => {
      const payload = await fetchOpenMeteo(OPEN_METEO_FORECAST_URL, {
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "precipitation",
          "rain",
          "weather_code",
          "wind_speed_10m",
          "wind_direction_10m",
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "rain_sum",
          "precipitation_probability_max",
          "wind_speed_10m_max",
          "uv_index_max",
        ].join(","),
        forecast_days: Math.min(Math.max(params.days, 1), 16),
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: "auto",
      });
      const current = payload.current ?? {};
      const daily = payload.daily;

      return {
        current: {
          apparentTemperature: (current.apparent_temperature as number | null | undefined) ?? null,
          precipitation: (current.precipitation as number | null | undefined) ?? null,
          rain: (current.rain as number | null | undefined) ?? null,
          relativeHumidity: (current.relative_humidity_2m as number | null | undefined) ?? null,
          temperature: (current.temperature_2m as number | null | undefined) ?? null,
          time: (current.time as string | null | undefined) ?? null,
          weatherCode: (current.weather_code as number | null | undefined) ?? null,
          weatherLabel: weatherCodeLabel(current.weather_code as number | null | undefined),
          windDirection: (current.wind_direction_10m as number | null | undefined) ?? null,
          windSpeed: (current.wind_speed_10m as number | null | undefined) ?? null,
        },
        daily: getStringList(daily, "time").map((date, index) => {
          const weatherCode = dailyValue(daily, "weather_code", index);
          return {
            date,
            precipitationProbabilityMax: dailyValue(daily, "precipitation_probability_max", index),
            rainSum: dailyValue(daily, "rain_sum", index),
            temperatureMax: dailyValue(daily, "temperature_2m_max", index),
            temperatureMin: dailyValue(daily, "temperature_2m_min", index),
            uvIndexMax: dailyValue(daily, "uv_index_max", index),
            weatherCode,
            weatherLabel: weatherCodeLabel(weatherCode),
            windSpeedMax: dailyValue(daily, "wind_speed_10m_max", index),
          };
        }),
        location,
        provider: "open-meteo",
        timezone: payload.timezone ?? "auto",
        units: {
          precipitation: payload.current_units?.rain ?? "mm",
          temperature: payload.current_units?.temperature_2m ?? "C",
          windSpeed: payload.current_units?.wind_speed_10m ?? "km/h",
        },
      };
    }),
  );

  return { generatedAt: new Date().toISOString(), weather: reports };
}

export async function getWeatherDashboard(params: {
  locationId: string;
  startDate: string;
  endDate: string;
}): Promise<WeatherDashboard> {
  const locations = await listWeatherLocations();
  const location = locations.find((item) => item.id === params.locationId);
  if (!location) throw new Error("Location not found.");

  const today = localIsoDate();
  const forecastWindowStart = addDays(today, -92);
  const forecastWindowEnd = addDays(today, 15);
  const fetches: Array<Promise<WeatherRecord[]>> = [];

  const directStart = params.startDate > forecastWindowStart ? params.startDate : forecastWindowStart;
  const directEnd = params.endDate < forecastWindowEnd ? params.endDate : forecastWindowEnd;

  if (directStart <= directEnd) {
    fetches.push(
      fetchOpenMeteo(OPEN_METEO_FORECAST_URL, {
        daily: FORECAST_DAILY_VARIABLES,
        forecast_days: Math.max(1, Math.min(16, daysBetween(today, directEnd) + 1)),
        hourly: FORECAST_HOURLY_VARIABLES,
        latitude: location.latitude,
        longitude: location.longitude,
        past_days: Math.max(0, Math.min(92, daysBetween(directStart, today))),
        timezone: "auto",
      }).then((payload) =>
        recordsFromPayload(payload, today).filter((record) => record.date >= directStart && record.date <= directEnd),
      ),
    );
  }

  const archiveEnd = params.endDate < addDays(directStart, -1) ? params.endDate : addDays(directStart, -1);
  if (params.startDate <= archiveEnd) {
    fetches.push(
      fetchOpenMeteo(OPEN_METEO_ARCHIVE_URL, {
        daily: ARCHIVE_DAILY_VARIABLES,
        end_date: archiveEnd,
        hourly: ARCHIVE_HOURLY_VARIABLES,
        latitude: location.latitude,
        longitude: location.longitude,
        start_date: params.startDate,
        timezone: "auto",
      }).then((payload) => recordsFromPayload(payload, today)),
    );
  }

  const records = (await Promise.all(fetches)).flat().sort((a, b) => a.date.localeCompare(b.date));
  const now = new Date().toISOString();

  return {
    location,
    records,
    sync: {
      lastAttempt: now,
      lastError: null,
      lastSuccessfulSync: now,
      provider: "open-meteo",
      status: "success",
    },
    today,
    units: {
      apparent_temperature_mean: "°C",
      cloud_cover_mean: "%",
      dew_point_2m_mean: "°C",
      et0_fao_evapotranspiration: "mm",
      precipitation_probability_max: "%",
      precipitation_sum: "mm",
      rain_sum: "mm",
      relative_humidity_2m_mean: "%",
      shortwave_radiation_sum: "MJ/m²",
      surface_pressure_mean: "hPa",
      temperature_2m_max: "°C",
      temperature_2m_min: "°C",
      uv_index_max: "",
      vapour_pressure_deficit_max: "kPa",
      visibility_mean: "m",
      wind_gusts_10m_max: "km/h",
      wind_speed_10m_max: "km/h",
      wind_speed_10m_mean: "km/h",
    },
  };
}

export async function getWeatherHourly(params: { locationId: string; hours: number }): Promise<WeatherHourlyForecast> {
  const locations = await listWeatherLocations();
  const location = locations.find((item) => item.id === params.locationId);
  if (!location) throw new Error("Location not found.");

  const payload = await fetchOpenMeteo(OPEN_METEO_FORECAST_URL, {
    forecast_days: 2,
    hourly: "rain,precipitation_probability",
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: "auto",
  });
  const times = getStringList(payload.hourly, "time");
  const rain = getNumberList(payload.hourly, "rain");
  const probability = getNumberList(payload.hourly, "precipitation_probability");
  const now = new Date();
  const points = times
    .map((time, index) => ({
      precipitationProbability: probability[index] ?? null,
      rain: rain[index] ?? null,
      time,
    }))
    .filter((point) => new Date(point.time).getTime() >= now.getTime())
    .slice(0, params.hours);

  return { location, points, timezone: payload.timezone ?? "auto" };
}

export async function syncWeatherLocation(_locationId: string): Promise<SyncResult> {
  const now = new Date().toISOString();
  return {
    lastAttempt: now,
    lastError: null,
    lastSuccessfulSync: now,
    status: "success",
  };
}
