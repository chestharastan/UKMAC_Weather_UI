"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createWeatherLocation,
  getWeather,
  listWeatherLocations,
  type DailyWeather,
  type WeatherLocation,
  type WeatherReport,
} from "@/lib/weather";

type StatusState = {
  tone: "normal" | "error";
  text: string;
};

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

function weatherSymbolClass(label = "") {
  const normalized = label.toLowerCase();
  if (normalized.includes("storm")) return " storm";
  if (
    normalized.includes("rain") ||
    normalized.includes("drizzle") ||
    normalized.includes("snow")
  ) {
    return " rain";
  }
  return "";
}

function ForecastRow({ day, maxRain }: { day: DailyWeather; maxRain: number }) {
  const rainValue = Number(day.rainSum || 0);
  const fill = maxRain > 0 ? Math.max(6, Math.min(100, (rainValue / maxRain) * 100)) : 6;

  return (
    <div className="forecast-row">
      <span className="forecast-date">{formatDate(day.date)}</span>
      <div className="bar-track">
        <span className="bar-fill" style={{ "--fill": `${fill}%` } as CSSProperties} />
      </div>
      <span className="forecast-rain">{formatNumber(day.rainSum)} mm</span>
      <span className="forecast-wind">{formatNumber(day.windSpeedMax)} km/h</span>
    </div>
  );
}

function WeatherCard({ report }: { report: WeatherReport }) {
  const current = report.current;
  const daily = report.daily;
  const maxRain = Math.max(...daily.map((day) => Number(day.rainSum || 0)), 0);
  const forecastRange = daily.length
    ? `${formatDate(daily[0].date)} - ${formatDate(daily[daily.length - 1].date)}`
    : "No data";
  const currentTime = current.time
    ? new Date(current.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--";

  return (
    <article className="weather-card">
      <div className="weather-card-header">
        <div>
          <p className="eyebrow">
            {formatNumber(report.location.latitude, 4)}, {formatNumber(report.location.longitude, 4)}
          </p>
          <h2>{report.location.name}</h2>
        </div>
        <span className="provider-badge">{report.provider}</span>
      </div>

      <div className="current-weather">
        <div className={`weather-symbol${weatherSymbolClass(current.weatherLabel || "")}`}>
          <span />
        </div>
        <div>
          <p className="current-temp">{formatNumber(current.temperature)} C</p>
          <p className="current-condition">{current.weatherLabel || "Weather"} at {currentTime}</p>
        </div>
      </div>

      <dl className="metric-grid">
        <div>
          <dt>Humidity</dt>
          <dd>{formatNumber(current.relativeHumidity, 0)}%</dd>
        </div>
        <div>
          <dt>Rain</dt>
          <dd>{formatNumber(current.rain)} mm</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{formatNumber(current.windSpeed)} km/h</dd>
        </div>
        <div>
          <dt>Feels like</dt>
          <dd>{formatNumber(current.apparentTemperature)} C</dd>
        </div>
      </dl>

      <div className="forecast">
        <div className="forecast-header">
          <h3>Forecast</h3>
          <span className="forecast-range">{forecastRange}</span>
        </div>
        <div className="forecast-list">
          {daily.map((day) => (
            <ForecastRow key={day.date} day={day} maxRain={maxRain} />
          ))}
        </div>
      </div>

      {report.warning ? <p className="status error">{report.warning}</p> : null}
    </article>
  );
}

function WeatherMonitor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [days, setDays] = useState(7);
  const [locationId, setLocationId] = useState("");
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [weather, setWeather] = useState<WeatherReport[]>([]);
  const [status, setStatus] = useState<StatusState>({
    tone: "normal",
    text: "Loading saved locations...",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDays(Number(searchParams.get("days")) || 7);
    setLocationId(searchParams.get("location") || "");
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  function updateUrl(next: { days?: number; locationId?: string; query?: string }) {
    const nextDays = next.days ?? days;
    const nextLocationId = next.locationId ?? locationId;
    const nextQuery = next.query ?? query;
    const params = new URLSearchParams();

    if (nextLocationId) params.set("location", nextLocationId);
    if (nextQuery) params.set("q", nextQuery);
    if (nextDays !== 7) params.set("days", String(nextDays));

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return locations.filter((location) => {
      const matchesQuery = !normalizedQuery || location.name.toLowerCase().includes(normalizedQuery);
      const matchesLocation = !locationId || location.id === locationId;
      return matchesQuery && matchesLocation;
    });
  }, [locations, locationId, query]);

  const visibleWeather = useMemo(() => {
    const visibleIds = new Set(filteredLocations.map((location) => location.id));
    return weather.filter((report) => visibleIds.has(report.location.id));
  }, [filteredLocations, weather]);

  const selectedLocation = locations.find((location) => location.id === locationId);
  const summaryText = `Showing ${days} day forecast for ${
    selectedLocation ? selectedLocation.name : "all saved locations"
  }${query ? ` matching "${query}"` : ""}.`;

  async function loadLocations() {
    const nextLocations = await listWeatherLocations();
    setLocations(nextLocations);
    if (locationId && !nextLocations.some((location) => location.id === locationId)) {
      setLocationId("");
      updateUrl({ locationId: "" });
    }
  }

  async function loadWeather(nextLocationId = locationId, nextDays = days) {
    setLoading(true);
    setStatus({ tone: "normal", text: "Loading weather..." });
    try {
      const payload = await getWeather({ days: nextDays, location: nextLocationId || undefined });
      setWeather(payload.weather);
      setStatus({
        tone: "normal",
        text: `Updated ${new Date(payload.generatedAt).toLocaleString()}.`,
      });
    } catch (error) {
      setWeather([]);
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not load weather.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const nextLocations = await listWeatherLocations();
        if (cancelled) return;
        setLocations(nextLocations);

        const requestedLocation = searchParams.get("location") || "";
        const nextLocationId = nextLocations.some((location) => location.id === requestedLocation)
          ? requestedLocation
          : "";
        const nextDays = Number(searchParams.get("days")) || 7;
        const payload = await getWeather({
          days: nextDays,
          location: nextLocationId || undefined,
        });
        if (cancelled) return;
        setWeather(payload.weather);
        setStatus({
          tone: "normal",
          text: `Updated ${new Date(payload.generatedAt).toLocaleString()}.`,
        });
      } catch (error) {
        if (cancelled) return;
        setStatus({
          tone: "error",
          text: error instanceof Error ? error.message : "Could not load weather.",
        });
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus({ tone: "normal", text: "Saving location..." });

    try {
      const created = await createWeatherLocation({
        latitude: Number(formData.get("latitude")),
        longitude: Number(formData.get("longitude")),
        name: String(formData.get("name") || ""),
      });
      form.reset();
      await loadLocations();
      setLocationId(created.id);
      setQuery("");
      updateUrl({ locationId: created.id, query: "" });
      await loadWeather(created.id, days);
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save location.",
      });
    }
  }

  async function copyShareLink() {
    updateUrl({});
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus({ tone: "normal", text: "Link copied with the current filters." });
    } catch {
      setStatus({ tone: "normal", text: window.location.href });
    }
  }

  return (
    <main className="shell">
      <section className="toolbar" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">UKMAC Weather Monitor</p>
          <h1 id="page-title">Weather Monitor System</h1>
          <p className="summary">{summaryText}</p>
        </div>
        <div className="toolbar-actions">
          <button className="button secondary" type="button" disabled={loading} onClick={() => loadWeather()}>
            Refresh
          </button>
          <button className="button primary" type="button" onClick={copyShareLink}>
            Copy link
          </button>
        </div>
      </section>

      <section className="filters" aria-label="Weather filters">
        <label className="field">
          <span>Choose location</span>
          <select
            value={locationId}
            onChange={(event) => {
              const nextLocationId = event.target.value;
              setLocationId(nextLocationId);
              updateUrl({ locationId: nextLocationId });
              loadWeather(nextLocationId, days);
            }}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Filter by name</span>
          <input
            placeholder="Search location"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              updateUrl({ query: event.target.value });
            }}
          />
        </label>
        <label className="field compact">
          <span>Forecast days</span>
          <select
            value={days}
            onChange={(event) => {
              const nextDays = Number(event.target.value) || 7;
              setDays(nextDays);
              updateUrl({ days: nextDays });
              loadWeather(locationId, nextDays);
            }}
          >
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="10">10 days</option>
            <option value="16">16 days</option>
          </select>
        </label>
        <button
          className="button ghost"
          type="button"
          onClick={() => {
            setLocationId("");
            setQuery("");
            setDays(7);
            updateUrl({ days: 7, locationId: "", query: "" });
            loadWeather("", 7);
          }}
        >
          Clear
        </button>
      </section>

      <div className="workspace">
        <aside className="panel location-panel" aria-labelledby="locations-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Saved</p>
              <h2 id="locations-title">Locations</h2>
            </div>
            <span className="count">{filteredLocations.length}</span>
          </div>
          <div className="location-list">
            {filteredLocations.length ? (
              filteredLocations.map((location) => (
                <button
                  className={`location-button${location.id === locationId ? " is-active" : ""}`}
                  key={location.id}
                  type="button"
                  onClick={() => {
                    const nextLocationId = location.id === locationId ? "" : location.id;
                    setLocationId(nextLocationId);
                    updateUrl({ locationId: nextLocationId });
                    loadWeather(nextLocationId, days);
                  }}
                >
                  <span className="location-name">{location.name}</span>
                  <span className="location-meta">
                    {formatNumber(location.latitude, 4)}, {formatNumber(location.longitude, 4)}
                  </span>
                </button>
              ))
            ) : (
              <div className="empty">No matching locations.</div>
            )}
          </div>

          <form className="location-form" onSubmit={handleCreateLocation}>
            <h3>Add location</h3>
            <label className="field">
              <span>Location name</span>
              <input name="name" required maxLength={120} placeholder="Example: Farm Block A" />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Latitude</span>
                <input
                  name="latitude"
                  required
                  inputMode="decimal"
                  placeholder="11.5564"
                  type="number"
                  min="-90"
                  max="90"
                  step="0.000001"
                />
              </label>
              <label className="field">
                <span>Longitude</span>
                <input
                  name="longitude"
                  required
                  inputMode="decimal"
                  placeholder="104.9282"
                  type="number"
                  min="-180"
                  max="180"
                  step="0.000001"
                />
              </label>
            </div>
            <button className="button primary stretch" type="submit">
              Save location
            </button>
          </form>
        </aside>

        <section className="weather-area" aria-live="polite">
          <div className={`status${status.tone === "error" ? " error" : ""}`}>{status.text}</div>
          <div className="weather-grid">
            {visibleWeather.length ? (
              visibleWeather.map((report) => <WeatherCard key={report.location.id} report={report} />)
            ) : (
              <div className="empty">
                {locations.length
                  ? "No weather report matches the current filter."
                  : "Add a location to start monitoring weather."}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="shell">Loading weather monitor...</main>}>
      <WeatherMonitor />
    </Suspense>
  );
}
