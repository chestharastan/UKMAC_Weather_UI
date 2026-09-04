import type { SyncResult, WeatherDashboard, WeatherHourlyForecast } from "@/modules/weather/weather.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.detail === "string"
        ? payload.detail
        : payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function listWeatherLocations() {
  return requestJson<WeatherLocation[]>("/api/locations");
}

export function createWeatherLocation(input: WeatherLocationInput) {
  return requestJson<WeatherLocation>("/api/locations", {
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function updateWeatherLocation(id: string, input: WeatherLocationInput) {
  return requestJson<WeatherLocation>(`/api/locations/${id}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function deleteWeatherLocation(id: string) {
  return requestJson<null>(`/api/locations/${id}`, {
    method: "DELETE",
  });
}

export function getWeather(params: { days: number; location?: string }) {
  const query = new URLSearchParams({ days: String(params.days) });
  if (params.location) {
    query.set("location", params.location);
  }
  return requestJson<WeatherResponse>(`/api/weather?${query.toString()}`);
}

export function getWeatherDashboard(params: { locationId: string; startDate: string; endDate: string }) {
  const query = new URLSearchParams({
    location_id: params.locationId,
    start_date: params.startDate,
    end_date: params.endDate,
  });
  return requestJson<WeatherDashboard>(`/api/weather/dashboard?${query.toString()}`);
}

export function getWeatherHourly(params: { locationId: string; hours: number }) {
  const query = new URLSearchParams({
    location_id: params.locationId,
    hours: String(params.hours),
  });
  return requestJson<WeatherHourlyForecast>(`/api/weather/hourly?${query.toString()}`);
}

export function syncWeatherLocation(locationId: string) {
  return requestJson<SyncResult>(`/api/weather/sync/${locationId}`, { method: "POST" });
}
