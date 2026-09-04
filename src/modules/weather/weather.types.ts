import type { WeatherLocation } from "@/lib/weather";

export type WeatherDataType = "historical" | "forecast";

export type WeatherRecord = {
  apparent_temperature_max: number | null;
  apparent_temperature_mean: number | null;
  apparent_temperature_min: number | null;
  cloud_cover_mean: number | null;
  dataType: WeatherDataType;
  date: string;
  dew_point_2m_mean: number | null;
  et0_fao_evapotranspiration: number | null;
  precipitation_probability_max: number | null;
  precipitation_sum: number | null;
  rain_sum: number | null;
  relative_humidity_2m_mean: number | null;
  shortwave_radiation_sum: number | null;
  surface_pressure_mean: number | null;
  temperature_2m_max: number | null;
  temperature_2m_min: number | null;
  uv_index_max: number | null;
  vapour_pressure_deficit_max: number | null;
  visibility_mean: number | null;
  weather_code: number | null;
  wind_direction_10m_dominant: number | null;
  wind_gusts_10m_max: number | null;
  wind_speed_10m_max: number | null;
  wind_speed_10m_mean: number | null;
};

export type WeatherMetricKey = Exclude<keyof WeatherRecord, "dataType" | "date" | "weather_code">;

export type WeatherSyncStatus = {
  provider: string;
  status: "success" | "failed" | "updating";
  lastAttempt: string | null;
  lastError: string | null;
  lastSuccessfulSync: string | null;
};

export type WeatherDashboard = {
  location: WeatherLocation;
  records: WeatherRecord[];
  sync: WeatherSyncStatus;
  today: string;
  units: Record<string, string>;
};

export type WeatherHourlyPoint = {
  time: string;
  rain: number | null;
  precipitationProbability: number | null;
};

export type WeatherHourlyForecast = {
  location: WeatherLocation;
  timezone: string;
  points: WeatherHourlyPoint[];
};

export type SyncResult = {
  status: "success" | "failed" | "updating";
  lastAttempt: string | null;
  lastError: string | null;
  lastSuccessfulSync: string | null;
};
