"use client";

import {
  CalendarRange,
  CloudSun,
  ChevronDown,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Info,
  Layers,
  Leaf,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { cn } from "@/lib/utils/cn";
import { getCachedValue, setCachedValue } from "@/lib/utils/localCache";
import type { WeatherLocation } from "@/lib/weather";
import { getWeatherDashboard, getWeatherHourly, syncWeatherLocation } from "@/lib/weather";
import {
  ChartPanel,
  HistoricalForecastLineChart,
  HourlyRainfallChart,
  RainfallChart,
  WaterBalanceChart,
} from "@/modules/weather/WeatherCharts";
import { conditionLabel, directionLabel } from "@/modules/weather/weatherIcons";
import type { WeatherDashboard as WeatherDashboardData, WeatherHourlyPoint, WeatherRecord } from "@/modules/weather/weather.types";
import { getCachedSeasonalForecast, getSeasonalForecast, setCachedSeasonalForecast } from "@/modules/weather/seasonalForecast";

type HourlyRange = 6 | 12 | 24;
const NEAR_FORECAST_DAYS = 16;
const OUTLOOK_MAX_DAYS = 270;
const HISTORICAL_FLOOR_DATE = "2015-01-01";
const SEASONAL_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DASHBOARD_CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

type WeatherDashboardPanelProps = {
  initialEndDate?: string;
  initialStartDate?: string;
  location: WeatherLocation;
  onDateRangeChange: (startDate: string, endDate: string) => void;
};

const OUTLOOK_MODEL_TIERS: Array<{ range: string; model: string; resolution: string; update: string }> = [
  { range: "Selected start → today", model: "Cached historical (this dashboard)", resolution: "Observed", update: "Daily" },
  { range: "Today → 16 days", model: "Open-Meteo Forecast API", resolution: "Higher resolution", update: "Frequent" },
  { range: "Day 17 → 46", model: "ECMWF EC46", resolution: "~36 km", update: "Daily" },
  { range: "Day 47 → ~9 months", model: "ECMWF SEAS5", resolution: "~36 km", update: "Monthly" },
];

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

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function formatMetric(value: number | null | undefined, unit: string, digits = 1) {
  const formatted = formatNumber(value, digits);
  if (formatted === "N/A" || !unit) return formatted;
  const separator = unit === "%" || unit.startsWith("°") ? "" : " ";
  return `${formatted}${separator}${unit}`;
}

function formatSignedMetric(value: number | null | undefined, unit: string, digits = 1) {
  const formatted = formatMetric(value, unit, digits);
  return value !== null && value !== undefined && value > 0 ? `+${formatted}` : formatted;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const SKELETON_BAR_HEIGHTS = [38, 52, 44, 60, 48, 66, 42, 58, 50, 70, 46, 62, 40, 56, 48, 64, 44, 58, 50, 46];
const SKELETON_LINE_POINTS = [66, 58, 62, 48, 54, 42, 46, 34, 40, 30, 38, 26, 32, 24];

function SkeletonTextBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <span
          className="block h-3 animate-pulse rounded bg-[#e7ece8]"
          key={index}
          style={{ animationDelay: `${index * 70}ms`, width: `${index === rows - 1 ? 56 : 88 - index * 14}%` }}
        />
      ))}
    </div>
  );
}

function SkeletonMetricGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="rounded-md border border-[var(--line)] bg-[#fbfcfb] p-3" key={index}>
          <span className="block h-3 w-20 animate-pulse rounded bg-[#e7ece8]" />
          <span className="mt-3 block h-6 w-24 animate-pulse rounded bg-[#dfe7e2]" style={{ animationDelay: `${index * 80}ms` }} />
          <span className="mt-2 block h-2.5 w-16 animate-pulse rounded bg-[#edf1ee]" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChartBars({ height = 220 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden rounded-md bg-[#f7f9f7] p-3" style={{ height }}>
      <div className="absolute inset-x-3 top-6 space-y-9">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="block border-t border-dashed border-[#dce4df]" key={index} />
        ))}
      </div>
      <div className="relative flex h-full items-end gap-1">
        {SKELETON_BAR_HEIGHTS.map((barHeight, index) => (
          <span
            className="flex-1 animate-pulse rounded-t-sm bg-[#e2e8e4]"
            key={index}
            style={{ animationDelay: `${index * 45}ms`, height: `${barHeight}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonLineChart({ height = 220 }: { height?: number }) {
  return (
    <div className="relative overflow-hidden rounded-md bg-[#f7f9f7] p-3" style={{ height }}>
      <div className="absolute inset-x-3 top-6 space-y-9">
        {Array.from({ length: 5 }, (_, index) => (
          <span className="block border-t border-dashed border-[#dce4df]" key={index} />
        ))}
      </div>
      <div className="relative flex h-full items-end gap-1.5">
        {SKELETON_LINE_POINTS.map((pointHeight, index) => (
          <div className="flex flex-1 flex-col items-center gap-1" key={index}>
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#b7c9c0]"
              style={{ animationDelay: `${index * 55}ms`, marginBottom: `${pointHeight}%` }}
            />
            <span className="h-2 w-full rounded-sm bg-[#e7ece8]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartPanelSkeleton({
  description,
  height = 220,
  variant = "line",
  title,
}: {
  description?: string;
  height?: number;
  variant?: "bar" | "line";
  title: string;
}) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p> : null}
        </div>
        <div className="flex gap-2">
          <span className="h-7 w-16 animate-pulse rounded-md bg-[#f1f4f2]" />
          <span className="h-7 w-16 animate-pulse rounded-md bg-[#f1f4f2]" />
        </div>
      </div>
      <div className="mb-3 flex gap-4">
        <span className="h-3 w-24 animate-pulse rounded bg-[#e7ece8]" />
        <span className="h-3 w-20 animate-pulse rounded bg-[#e7ece8]" />
        <span className="h-3 w-16 animate-pulse rounded bg-[#e7ece8]" />
      </div>
      {variant === "bar" ? <SkeletonChartBars height={height} /> : <SkeletonLineChart height={height} />}
    </section>
  );
}

export function DashboardSkeleton({ showControls = true }: { showControls?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading weather dashboard" className="space-y-5" role="status">
      {showControls ? <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="block h-3 w-36 animate-pulse rounded bg-[#dfe7e2]" />
            <span className="mt-3 block h-7 w-52 max-w-full animate-pulse rounded bg-[#e7ece8]" />
            <div className="mt-4 max-w-xl">
              <SkeletonTextBlock rows={3} />
            </div>
          </div>
          <span className="h-9 w-28 animate-pulse rounded-md bg-[#eef3f0]" />
        </div>

        <div className="mt-5 grid gap-4 rounded-md border border-[var(--line)] bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <span className="block h-3 w-20 animate-pulse rounded bg-[#e7ece8]" />
            <span className="mt-2 block h-10 animate-pulse rounded-md bg-[#f1f4f2]" />
          </div>
          <div>
            <span className="block h-3 w-20 animate-pulse rounded bg-[#e7ece8]" />
            <span className="mt-2 block h-10 animate-pulse rounded-md bg-[#f1f4f2]" />
          </div>
          <span className="self-end h-10 w-28 animate-pulse rounded-md bg-[#e2e8e4]" />
        </div>
      </section> : null}

      <SkeletonMetricGrid />
      <ChartPanelSkeleton height={260} title="Temperature Trend" />
      <ChartPanelSkeleton height={240} title="Daily Rainfall Trend" variant="bar" />
      <ChartPanelSkeleton height={220} title="Wind Conditions" />
      <ChartPanelSkeleton height={220} title="Humidity Trend" />

      <div className="flex items-center justify-between rounded-md border border-[var(--line)] bg-white p-4 text-sm font-semibold shadow-sm sm:p-5">
        <span className="h-4 w-36 animate-pulse rounded bg-[#e7ece8]" />
        <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
      </div>
    </div>
  );
}

export function WeatherDashboardPanel({
  initialEndDate,
  initialStartDate,
  location,
  onDateRangeChange,
}: WeatherDashboardPanelProps) {
  const initialToday = localIsoDate();
  const [startDate, setStartDate] = useState(() => initialStartDate || addDays(initialToday, -13));
  const [endDate, setEndDate] = useState(() => initialEndDate || addDays(initialToday, 14));
  const [mode, setMode] = useState<"forecast" | "custom">(() =>
    startDate === initialToday && endDate === addDays(initialToday, NEAR_FORECAST_DAYS - 1) ? "forecast" : "custom",
  );
  // Remembers the last custom end date you picked, kept in sync on every edit
  // (not just when leaving custom mode), so switching to "Next 16 days" and
  // back restores exactly what you chose instead of an outdated snapshot.
  // The start date is never touched by the mode toggle — it only ever
  // changes when you edit it directly.
  const [customEndDate, setCustomEndDate] = useState(() => endDate);

  useEffect(() => {
    setStartDate(initialStartDate || addDays(localIsoDate(), -13));
    setEndDate(initialEndDate || addDays(localIsoDate(), 14));
  }, [initialStartDate, initialEndDate]);

  function updateStartDate(nextStartDate: string) {
    if (!nextStartDate) return;
    setStartDate(nextStartDate);
    const nextEndDate = mode === "forecast" ? addDays(nextStartDate, NEAR_FORECAST_DAYS - 1) : endDate;
    if (mode === "forecast") setEndDate(nextEndDate);
    onDateRangeChange(nextStartDate, nextEndDate);
  }

  function updateEndDate(nextEndDate: string) {
    if (!nextEndDate) return;
    setEndDate(nextEndDate);
    setMode("custom");
    setCustomEndDate(nextEndDate);
    onDateRangeChange(startDate, nextEndDate);
  }
  const [dashboard, setDashboard] = useState<WeatherDashboardData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hourlyError, setHourlyError] = useState("");
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyPoints, setHourlyPoints] = useState<WeatherHourlyPoint[]>([]);
  const [hourlyRange, setHourlyRange] = useState<HourlyRange>(24);
  const [seasonalRecords, setSeasonalRecords] = useState<WeatherRecord[]>([]);
  const [seasonalLoading, setSeasonalLoading] = useState(false);
  const [seasonalError, setSeasonalError] = useState("");
  const [seasonalFetchedAt, setSeasonalFetchedAt] = useState<Date | null>(null);
  const dashboardRequestId = useRef(0);

  const today = initialToday;
  const nearForecastEndDate = useMemo(() => addDays(today, NEAR_FORECAST_DAYS - 1), [today]);
  const isNearForecast = mode === "forecast";
  const needsSeasonal = endDate > nearForecastEndDate;
  const maxEndDate = useMemo(() => addDays(today, OUTLOOK_MAX_DAYS), [today]);

  function selectRange(nextMode: "forecast" | "custom") {
    if (nextMode === mode) return;
    setMode(nextMode);
    const nextEndDate = nextMode === "forecast" ? addDays(startDate, NEAR_FORECAST_DAYS - 1) : customEndDate;
    setEndDate(nextEndDate);
    onDateRangeChange(startDate, nextEndDate);
  }

  const hourlyCacheKey = `weather-hourly:${location.id}`;

  const loadHourlyForecast = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setHourlyLoading(true);
        setHourlyError("");
      }
      try {
        const response = await getWeatherHourly({ hours: 24, locationId: location.id });
        setHourlyPoints(response.points);
        setCachedValue(hourlyCacheKey, response.points);
      } catch (requestError) {
        if (!options?.silent) {
          setHourlyPoints([]);
          setHourlyError(requestError instanceof Error ? requestError.message : "Could not load hourly rainfall data.");
        }
      } finally {
        if (!options?.silent) setHourlyLoading(false);
      }
    },
    [hourlyCacheKey, location.id],
  );

  useEffect(() => {
    // Paint instantly from a cached copy (if any) instead of showing a loading
    // state. Only kick off a background refresh if that copy is actually
    // stale (2h+) — refetching on every single view was pure wasted work
    // (and a pointless re-render) when the cache was already current.
    const cached = getCachedValue<WeatherHourlyPoint[]>(hourlyCacheKey);
    if (cached) {
      setHourlyPoints(cached.value);
      if (Date.now() - new Date(cached.cachedAt).getTime() >= DASHBOARD_CACHE_MAX_AGE_MS) {
        queueMicrotask(() => void loadHourlyForecast({ silent: true }));
      }
    } else {
      queueMicrotask(() => void loadHourlyForecast());
    }
  }, [hourlyCacheKey, loadHourlyForecast]);

  const fetchEndDate = endDate > nearForecastEndDate ? nearForecastEndDate : endDate;
  const dashboardCacheKey = `weather-dashboard:${location.id}:${startDate}:${fetchEndDate}`;

  const loadDashboard = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!startDate || !fetchEndDate) return;
      const requestId = ++dashboardRequestId.current;

      if (!options?.silent) {
        setIsLoading(true);
        setError("");
      }
      try {
        const response = await getWeatherDashboard({
          endDate: fetchEndDate,
          locationId: location.id,
          startDate,
        });
        setCachedValue(dashboardCacheKey, response);
        if (requestId === dashboardRequestId.current) setDashboard(response);
      } catch (requestError) {
        if (requestId === dashboardRequestId.current && !options?.silent) {
          setError(requestError instanceof Error ? requestError.message : "Could not load cached weather data.");
        }
      } finally {
        if (requestId === dashboardRequestId.current && !options?.silent) setIsLoading(false);
      }
    },
    [dashboardCacheKey, fetchEndDate, location.id, startDate],
  );

  useEffect(() => {
    const cached = getCachedValue<WeatherDashboardData>(dashboardCacheKey);
    if (cached) {
      setDashboard(cached.value);
      setIsLoading(false);
      setError("");
      if (Date.now() - new Date(cached.cachedAt).getTime() >= DASHBOARD_CACHE_MAX_AGE_MS) {
        void loadDashboard({ silent: true });
      }
    } else {
      void loadDashboard();
    }
    return () => {
      dashboardRequestId.current += 1;
    };
  }, [dashboardCacheKey, loadDashboard]);

  const loadSeasonal = useCallback(async () => {
    setSeasonalLoading(true);
    setSeasonalError("");
    try {
      const response = await getSeasonalForecast(location.latitude, location.longitude);
      setSeasonalRecords(response);
      const fetchedAt = new Date();
      setSeasonalFetchedAt(fetchedAt);
      setCachedSeasonalForecast(location.id, response);
    } catch (requestError) {
      setSeasonalRecords([]);
      setSeasonalError(requestError instanceof Error ? requestError.message : "Could not load the seasonal outlook.");
    } finally {
      setSeasonalLoading(false);
    }
  }, [location.id, location.latitude, location.longitude]);

  useEffect(() => {
    if (!needsSeasonal) return;

    queueMicrotask(() => {
      const cached = getCachedSeasonalForecast(location.id);
      if (cached) {
        setSeasonalRecords(cached.records);
        setSeasonalFetchedAt(new Date(cached.fetchedAt));
        if (Date.now() - new Date(cached.fetchedAt).getTime() < SEASONAL_CACHE_MAX_AGE_MS) {
          return;
        }
      }
      void loadSeasonal();
    });
  }, [needsSeasonal, location.id, loadSeasonal]);

  const handleRefresh = useCallback(async () => {
    setIsSyncing(true);
    setError("");
    try {
      await syncWeatherLocation(location.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not refresh weather data from the provider.");
    } finally {
      setIsSyncing(false);
    }

    const reloads = [loadDashboard(), loadHourlyForecast()];
    if (needsSeasonal) reloads.push(loadSeasonal());
    await Promise.all(reloads);
  }, [loadDashboard, loadHourlyForecast, loadSeasonal, needsSeasonal]);

  const records = useMemo(() => {
    const base = (dashboard?.records ?? []).filter((record) => record.date >= startDate && record.date <= endDate);
    if (!needsSeasonal) return base;

    const lastNearDate = base.at(-1)?.date ?? today;
    const futureSeasonal = seasonalRecords.filter((record) => record.date > lastNearDate && record.date >= startDate && record.date <= endDate);
    return [...base, ...futureSeasonal].sort((a, b) => a.date.localeCompare(b.date));
  }, [dashboard?.records, endDate, needsSeasonal, seasonalRecords, startDate, today]);
  const visibleHourlyPoints = useMemo(() => hourlyPoints.slice(0, hourlyRange), [hourlyPoints, hourlyRange]);
  const current = useMemo(() => {
    if (!dashboard) return null;
    return (
      records.find((record) => record.date === today && record.dataType === "forecast") ??
      records.find((record) => record.date === today) ??
      [...records].reverse().find((record) => record.date <= today) ??
      null
    );
  }, [dashboard, records, today]);
  const waterBalance =
    current?.rain_sum !== null &&
    current?.rain_sum !== undefined &&
    current?.et0_fao_evapotranspiration !== null &&
    current?.et0_fao_evapotranspiration !== undefined
      ? current.rain_sum - current.et0_fao_evapotranspiration
      : null;

  return (
    <div className="space-y-5">
      <section aria-label="Weather range" className="border-y border-[var(--line)] py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">{location.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <MapPin aria-hidden className="h-3.5 w-3.5" />
              {formatNumber(location.latitude, 4)}, {formatNumber(location.longitude, 4)}
            </p>
          </div>
          <div aria-label="Date range mode" className="grid w-full grid-cols-2 gap-1 rounded-md bg-[#f1f4f2] p-1 sm:w-auto" role="group">
            {[
              { mode: "forecast" as const, label: "Next 16 days", icon: CloudSun, active: isNearForecast },
              { mode: "custom" as const, label: "Custom range", icon: CalendarRange, active: !isNearForecast },
            ].map(({ mode, label, icon: Icon, active }) => (
              <button
                aria-pressed={active}
                className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[var(--accent)]", active ? "bg-white text-[var(--accent-strong)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}
                key={mode}
                onClick={() => selectRange(mode)}
                type="button"
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="col-span-2 grid min-w-0 gap-3 sm:contents">
              <CalendarDatePicker
                clearable={false}
                label="Start date"
                name="weather-start"
                max={endDate}
                min={HISTORICAL_FLOOR_DATE}
                onChange={updateStartDate}
                value={startDate}
              />
              <CalendarDatePicker
                clearable={false}
                label="End date"
                name="weather-end"
                max={maxEndDate}
                min={startDate}
                onChange={updateEndDate}
                value={endDate}
              />
            </div>
            <Button aria-label="Refresh weather" title="Refresh weather" className="col-start-2 row-start-2 w-11 !px-0 sm:col-start-3 sm:row-start-1" disabled={isLoading || isSyncing} onClick={() => void handleRefresh()} variant="secondary">
              <RefreshCw aria-hidden className={cn("h-4 w-4", (isLoading || isSyncing) && "animate-spin")} />
            </Button>
            <p className="col-start-1 row-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:col-span-3">
              <span className="font-semibold text-[var(--accent-strong)]">{isNearForecast ? "16-day forecast" : needsSeasonal ? "Historical & seasonal outlook" : endDate < today ? "Historical weather" : "Daily weather"}</span>
              <span className="text-[var(--muted)]">{isNearForecast ? "Open-Meteo Forecast API" : needsSeasonal ? "Open-Meteo + ECMWF seasonal" : "Open-Meteo"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--muted)]">
              {startDate < today ? <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-6 bg-[#46635a]" /> Historical
              </span> : null}
              {endDate >= today ? <span className="inline-flex items-center gap-2">
                <span className="w-6 border-t-2 border-dashed border-[#46635a]" /> Forecast
              </span> : null}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Updated:{" "}
              <strong className="text-[var(--foreground)]">{formatUpdatedAt(dashboard?.sync.lastSuccessfulSync ?? null)}</strong>
            </p>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-md border border-[#f3c7c2] bg-[#fff5f3] p-4 text-sm text-[#9f2d24]">{error}</div> : null}
      {dashboard?.sync.status === "failed" && dashboard.sync.lastError ? (
        <div className="rounded-md border border-[#efd6ad] bg-[#fff9ee] p-4 text-sm text-[#85531c]">
          Latest weather sync failed. The dashboard is showing the last successfully cached data.
        </div>
      ) : null}

      {dashboard && !isLoading && !records.length ? (
        <div className="rounded-md border border-[var(--line)] bg-[#f7f9f7] p-10 text-center">
          <p className="text-sm font-semibold">No cached weather data for this range</p>
          <p className="mt-1 text-xs text-[var(--muted)]">The background sync will populate this location shortly.</p>
        </div>
      ) : null}

      {isLoading ? <DashboardSkeleton showControls={false} /> : null}

      {!isLoading && needsSeasonal ? (
        <section className="rounded-md border border-[var(--line)] bg-white shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0edfa] text-[#6e57a5]">
                  <Layers className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">How the past-to-future timeline is built</h2>
                  <p className="text-[11px] font-medium text-[var(--muted)]">
                    Cached history + Open-Meteo Seasonal Forecast API — ECMWF Seasonal Seamless (EC46 + SEAS5), ensemble mean
                  </p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)] transition group-open:rotate-180" />
            </summary>

            <div className="border-t border-[var(--line)] p-4 sm:p-5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-[11px] font-semibold uppercase text-[var(--muted)]">
                      <th className="py-2 pr-3">Forecast range</th>
                      <th className="py-2 pr-3">Model</th>
                      <th className="py-2 pr-3">Resolution</th>
                      <th className="py-2">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OUTLOOK_MODEL_TIERS.map((tier) => (
                      <tr className="border-b border-[var(--line)] last:border-0" key={tier.range}>
                        <td className="py-2.5 pr-3 font-semibold text-[var(--foreground)]">{tier.range}</td>
                        <td className="py-2.5 pr-3 text-[var(--foreground)]">{tier.model}</td>
                        <td className="py-2.5 pr-3 text-[var(--muted)]">{tier.resolution}</td>
                        <td className="py-2.5 text-[var(--muted)]">{tier.update}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-md border border-[var(--line)] bg-[#f7f9f7] p-3.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
                <p className="text-xs text-[var(--muted)]">
                  This is not a precise day-by-day forecast — beyond 16 days it's a probabilistic, ensemble-mean outlook that gets
                  less certain the further out it goes. The plain variable names (e.g.{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-[11px]">temperature_2m_max</code>) from Open-Meteo are
                  already the 51-member ensemble mean.
                </p>
              </div>
            </div>
          </details>

          {seasonalLoading ? (
            <p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)] sm:px-5">
              Loading seasonal outlook…
            </p>
          ) : seasonalError ? (
            <p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[#9f2d24] sm:px-5">{seasonalError}</p>
          ) : seasonalFetchedAt ? (
            <p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)] sm:px-5">
              Seasonal outlook loaded:{" "}
              <strong className="text-[var(--foreground)]">
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", hour: "numeric", minute: "2-digit", month: "short" }).format(
                  seasonalFetchedAt,
                )}
              </strong>
            </p>
          ) : null}
        </section>
      ) : null}

      {!isLoading && dashboard && records.length ? (
        <>
          <ChartPanel title="Temperature Trend">
            <HistoricalForecastLineChart
              records={records}
              series={[
                { color: "#c4572b", key: "temperature_2m_max", label: "Max temperature", unit: "°C" },
                { color: "#2878a7", key: "temperature_2m_min", label: "Min temperature", unit: "°C" },
              ]}
              today={today}
              tooltipSeries={[{ color: "#6d766f", key: "apparent_temperature_mean", label: "Apparent temperature", unit: "°C" }]}
              yAxisLabel="Temperature °C"
            />
          </ChartPanel>

          <ChartPanel title="Daily Rainfall Trend">
            <RainfallChart records={records} today={today} />
          </ChartPanel>

          <ChartPanel title="Wind Conditions">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <Compass className="h-4 w-4 text-[var(--accent)]" /> Dominant direction:{" "}
              <strong className="text-[var(--foreground)]">{directionLabel(current?.wind_direction_10m_dominant ?? null)}</strong>
            </div>
            {needsSeasonal ? (
              <p className="mb-3 text-xs text-[var(--muted)]">
                Open-Meteo only sends seasonal gust values for the near outlook. Later gust values are estimated from the
                recent seasonal relationship between gust and maximum wind.
              </p>
            ) : null}
            <HistoricalForecastLineChart
              records={records}
              series={[
                { color: "#2c7a75", key: "wind_speed_10m_mean", label: "Average wind", unit: "km/h" },
                { color: "#7262a6", key: "wind_speed_10m_max", label: "Maximum wind", unit: "km/h" },
                { color: "#b05845", key: "wind_gusts_10m_max", label: "Wind gust", unit: "km/h" },
              ]}
              today={today}
              yAxisLabel="Wind km/h"
            />
          </ChartPanel>

          <ChartPanel title="Humidity Trend">
            <HistoricalForecastLineChart
              records={records}
              series={[{ color: "#2d7a57", key: "relative_humidity_2m_mean", label: "Relative humidity", unit: "%" }]}
              today={today}
              yAxisLabel="Relative Humidity %"
            />
          </ChartPanel>

          <details className="group rounded-md border border-[var(--line)] bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold sm:p-5">
              More weather data
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)] transition group-open:rotate-180" />
            </summary>

            <div className="space-y-5 border-t border-[var(--line)] p-4 sm:p-5">
              {!needsSeasonal ? (
                <ChartPanel description="Live forecast from the current hour for the selected location." title="Rainfall and Rain Probability">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[var(--muted)]">Next {hourlyRange} hours</p>
                    <div aria-label="Hourly rainfall range" className="inline-flex rounded-md bg-[#f1f4f2] p-1" role="group">
                      {[6, 12, 24].map((range) => (
                        <button
                          aria-pressed={hourlyRange === range}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                            hourlyRange === range ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]",
                          )}
                          key={range}
                          onClick={() => setHourlyRange(range as HourlyRange)}
                          type="button"
                        >
                          {range}h
                        </button>
                      ))}
                    </div>
                  </div>
                  {hourlyLoading ? (
                    <div className="h-64 animate-pulse rounded-md bg-[#f1f4f2]" />
                  ) : hourlyError ? (
                    <p className="rounded-md bg-[#fff5f3] p-4 text-sm text-[#9f2d24]">{hourlyError}</p>
                  ) : (
                    <HourlyRainfallChart points={visibleHourlyPoints} />
                  )}
                </ChartPanel>
              ) : null}

              <ChartPanel
                description="Water balance is rainfall minus ET₀. Positive values mean rainfall exceeds estimated evapotranspiration."
                title="Rain vs ET₀ Water Balance"
              >
                <WaterBalanceChart records={records} today={today} />
              </ChartPanel>

              <ChartPanel title="VPD — Plant Environment">
                <HistoricalForecastLineChart
                  emptyMessage="No historical data"
                  records={records}
                  series={[{ color: "#a45b38", key: "vapour_pressure_deficit_max", label: "VPD", unit: "kPa" }]}
                  today={today}
                  yAxisLabel="VPD kPa"
                />
              </ChartPanel>

              <ChartPanel title="Solar Radiation">
                <HistoricalForecastLineChart
                  records={records}
                  series={[
                    {
                      color: "#c78a21",
                      key: "shortwave_radiation_sum",
                      label: "Solar radiation",
                      unit: dashboard.units.shortwave_radiation_sum ?? "MJ/m²",
                    },
                  ]}
                  today={today}
                  yAxisLabel={`Solar ${dashboard.units.shortwave_radiation_sum ?? "MJ/m²"}`}
                />
              </ChartPanel>

              <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-[var(--accent)]" />
                  <h2 className="text-base font-semibold">Agricultural Conditions</h2>
                </div>
                <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--muted)]">Water</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        Rainfall <strong className="float-right">{formatMetric(current?.rain_sum, "mm")}</strong>
                      </p>
                      <p>
                        ET₀ <strong className="float-right">{formatMetric(current?.et0_fao_evapotranspiration, "mm")}</strong>
                      </p>
                      <p>
                        Balance <strong className="float-right">{formatSignedMetric(waterBalance, "mm")}</strong>
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--muted)]">Plant environment</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        Humidity{" "}
                        <strong className="float-right">{formatMetric(current?.relative_humidity_2m_mean, "%", 0)}</strong>
                      </p>
                      <p>
                        VPD <strong className="float-right">{formatMetric(current?.vapour_pressure_deficit_max, "kPa", 3)}</strong>
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--muted)]">Sun</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        Solar <strong className="float-right">{formatMetric(current?.shortwave_radiation_sum, "MJ/m²")}</strong>
                      </p>
                      <p>
                        UV <strong className="float-right">{formatMetric(current?.uv_index_max, "")}</strong>
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--muted)]">Wind</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        Average <strong className="float-right">{formatMetric(current?.wind_speed_10m_mean, "km/h")}</strong>
                      </p>
                      <p>
                        Maximum <strong className="float-right">{formatMetric(current?.wind_speed_10m_max, "km/h")}</strong>
                      </p>
                      <p>
                        Gust <strong className="float-right">{formatMetric(current?.wind_gusts_10m_max, "km/h")}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <ChartPanel description="Cloud cover trend." title="Cloud Cover">
                <HistoricalForecastLineChart
                  records={records}
                  series={[{ color: "#748b9a", key: "cloud_cover_mean", label: "Cloud cover", unit: "%" }]}
                  today={today}
                  yAxisLabel="Cloud cover %"
                />
              </ChartPanel>

              <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 text-base font-semibold">Advanced Weather Details</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { icon: Gauge, label: "Surface pressure", value: formatMetric(current?.surface_pressure_mean, "hPa") },
                    { icon: Droplets, label: "Dew point", value: formatMetric(current?.dew_point_2m_mean, "°C") },
                    { icon: Eye, label: "Visibility", value: formatMetric(current?.visibility_mean, "m", 0) },
                    { icon: CalendarRange, label: "Weather condition", value: conditionLabel(current?.weather_code ?? null) },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div className="flex items-center gap-3" key={item.label}>
                        <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-[var(--muted)]">{item.label}</p>
                          <p className="truncate text-sm font-semibold" title={item.value}>
                            {item.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <ChartPanel title="UV Index">
                <p className="mb-2 text-3xl font-semibold">{formatMetric(current?.uv_index_max, "")}</p>
                {!records.some((record) => record.dataType === "historical" && record.uv_index_max !== null) ? (
                  <p className="mb-2 text-xs font-medium text-[var(--muted)]">No historical data</p>
                ) : null}
                <HistoricalForecastLineChart
                  emptyMessage="No historical data"
                  height={210}
                  records={records}
                  series={[{ color: "#7c5ba5", key: "uv_index_max", label: "UV index", unit: "" }]}
                  today={today}
                  yAxisLabel="UV index"
                />
              </ChartPanel>
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
