"use client";

import { CloudSun, Copy, Droplets, Plus, RefreshCw, Search, Thermometer, Wind } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageShell } from "@/components/shared/PageShell";
import { cn } from "@/lib/utils/cn";
import {
  createWeatherLocation,
  deleteWeatherLocation,
  getWeather,
  listWeatherLocations,
  updateWeatherLocation,
  type DailyWeather,
  type WeatherLocation,
  type WeatherLocationInput,
  type WeatherReport,
} from "@/lib/weather";
import { WeatherLocationForm } from "@/modules/weather/WeatherLocationForm";
import { WeatherLocationsTable } from "@/modules/weather/WeatherLocationsTable";
import { ConditionIcon, conditionLabel, directionLabel } from "@/modules/weather/weatherIcons";

const FORECAST_DAY_OPTIONS = [3, 7, 10, 16] as const;

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

function KpiCard({
  accent,
  icon: Icon,
  items,
  title,
  value,
}: {
  accent: string;
  icon: ComponentType<{ className?: string }>;
  items: Array<{ label: string; value: string }>;
  title: string;
  value: string;
}) {
  return (
    <article className="min-w-0 rounded-md border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">{title}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", accent)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold text-[var(--foreground)]" title={value}>
        {value}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
        {items.map((item) => (
          <div className="min-w-0" key={item.label}>
            <p className="text-[10px] font-medium uppercase text-[var(--muted)]">{item.label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-[var(--foreground)]" title={item.value}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function ForecastDayCard({ day, isToday }: { day: DailyWeather; isToday: boolean }) {
  const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(`${day.date}T00:00:00`));
  const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(`${day.date}T00:00:00`),
  );

  return (
    <article
      className={cn(
        "min-w-0 rounded-md border p-3.5 text-left transition",
        isToday ? "border-2 border-[var(--accent)]/50 bg-white" : "border-[var(--line)] bg-[#fbfcfb]",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {dayLabel}
            {isToday ? (
              <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Today
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-[var(--muted)]">{dateLabel}</p>
        </div>
        <ConditionIcon className="h-6 w-6 text-[#1677a8]" code={day.weatherCode} />
      </div>
      <p className="mt-3 text-lg font-semibold">
        {formatNumber(day.temperatureMax, 0)}° / {formatNumber(day.temperatureMin, 0)}°
      </p>
      <p className="mt-2 truncate text-[11px] font-medium text-[var(--muted)]" title={conditionLabel(day.weatherCode)}>
        {conditionLabel(day.weatherCode)}
      </p>
      <div className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-2.5 text-[11px] text-[var(--muted)]">
        <p className="flex justify-between">
          <span>Rain chance</span>
          <strong className="text-[var(--foreground)]">{formatMetric(day.precipitationProbabilityMax, "%", 0)}</strong>
        </p>
        <p className="flex justify-between">
          <span>Amount</span>
          <strong className="text-[var(--foreground)]">{formatMetric(day.rainSum, "mm")}</strong>
        </p>
        <p className="flex justify-between">
          <span>Wind</span>
          <strong className="text-[var(--foreground)]">{formatMetric(day.windSpeedMax, "km/h")}</strong>
        </p>
      </div>
    </article>
  );
}

function WeatherMonitor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [locationsError, setLocationsError] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [days, setDays] = useState<number>(7);

  const [report, setReport] = useState<WeatherReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WeatherLocation | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<WeatherLocation | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSelectedLocationId(searchParams.get("location") || "");
    setDays(Number(searchParams.get("days")) || 7);
  }, [searchParams]);

  function updateUrl(next: { days?: number; locationId?: string }) {
    const nextDays = next.days ?? days;
    const nextLocationId = next.locationId ?? selectedLocationId;
    const params = new URLSearchParams();

    if (nextLocationId) params.set("location", nextLocationId);
    if (nextDays !== 7) params.set("days", String(nextDays));

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  const loadLocations = useCallback(async () => {
    setLocationsLoading(true);
    setLocationsError("");
    try {
      const nextLocations = await listWeatherLocations();
      setLocations(nextLocations);
      return nextLocations;
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : "Could not load saved locations.");
      return [];
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const filteredLocations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return locations;
    return locations.filter((location) => location.name.toLowerCase().includes(normalizedQuery));
  }, [locations, query]);

  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;

  const loadWeather = useCallback(async (locationId: string, forecastDays: number) => {
    if (!locationId) {
      setReport(null);
      return;
    }

    setWeatherLoading(true);
    setWeatherError("");
    try {
      const payload = await getWeather({ days: forecastDays, location: locationId });
      setReport(payload.weather[0] ?? null);
    } catch (error) {
      setReport(null);
      setWeatherError(error instanceof Error ? error.message : "Could not load weather.");
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather(selectedLocationId, days);
  }, [selectedLocationId, days, loadWeather]);

  function selectLocation(location: WeatherLocation) {
    const nextLocationId = location.id === selectedLocationId ? "" : location.id;
    setSelectedLocationId(nextLocationId);
    updateUrl({ locationId: nextLocationId });
  }

  function selectDays(nextDays: number) {
    setDays(nextDays);
    updateUrl({ days: nextDays });
  }

  async function handleCreateLocation(input: WeatherLocationInput) {
    const created = await createWeatherLocation(input);
    await loadLocations();
    setIsCreateOpen(false);
    setSelectedLocationId(created.id);
    updateUrl({ locationId: created.id });
  }

  async function handleEditLocation(input: WeatherLocationInput) {
    if (!editingLocation) return;
    await updateWeatherLocation(editingLocation.id, input);
    await loadLocations();
    setEditingLocation(null);
    if (editingLocation.id === selectedLocationId) {
      await loadWeather(selectedLocationId, days);
    }
  }

  async function handleDeleteLocation() {
    if (!deletingLocation) return;
    setDeleteError("");
    setIsDeleting(true);
    try {
      await deleteWeatherLocation(deletingLocation.id);
      await loadLocations();
      if (deletingLocation.id === selectedLocationId) {
        setSelectedLocationId("");
        updateUrl({ locationId: "" });
      }
      setDeletingLocation(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete location.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function copyShareLink() {
    updateUrl({});
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  const current = report?.current ?? null;
  const daily = report?.daily ?? [];
  const todayDaily = daily[0];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageShell
        actions={
          <>
            <Button className="gap-2" onClick={copyShareLink} type="button" variant="secondary">
              <Copy className="h-4 w-4" />
              {linkCopied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              className="gap-2"
              disabled={weatherLoading || !selectedLocationId}
              onClick={() => void loadWeather(selectedLocationId, days)}
              type="button"
            >
              <RefreshCw className={cn("h-4 w-4", weatherLoading && "animate-spin")} />
              Refresh
            </Button>
          </>
        }
        description="Add locations by coordinate and monitor current and forecast conditions for farm and water management."
        title="Weather Dashboard"
      >
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--muted)]">Saved locations</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className="h-9 w-48 rounded-md border border-[var(--line)] bg-[#fbfbfc] pl-9 pr-3 text-sm outline-none transition-all duration-150 placeholder:text-[#9aa6a1] focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent-soft)]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search location"
                  type="search"
                  value={query}
                />
              </div>
              <Button className="gap-2" onClick={() => setIsCreateOpen(true)} size="sm" type="button">
                <Plus className="h-4 w-4" />
                Add location
              </Button>
            </div>
          </div>

          <WeatherLocationsTable
            isLoading={locationsLoading}
            locations={filteredLocations}
            onDelete={setDeletingLocation}
            onEdit={setEditingLocation}
            onSelect={selectLocation}
            selectedLocationId={selectedLocationId}
          />
          {locationsError ? <p className="text-sm text-[#b42318]">{locationsError}</p> : null}

          <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add location">
            <WeatherLocationForm onCancel={() => setIsCreateOpen(false)} onSubmit={handleCreateLocation} />
          </Modal>

          <Modal isOpen={Boolean(editingLocation)} onClose={() => setEditingLocation(null)} title="Edit location">
            {editingLocation ? (
              <WeatherLocationForm
                initialValues={{
                  latitude: editingLocation.latitude,
                  longitude: editingLocation.longitude,
                  name: editingLocation.name,
                }}
                mode="edit"
                onCancel={() => setEditingLocation(null)}
                onSubmit={handleEditLocation}
              />
            ) : null}
          </Modal>

          <Modal
            isOpen={Boolean(deletingLocation)}
            onClose={() => {
              if (!isDeleting) {
                setDeletingLocation(null);
                setDeleteError("");
              }
            }}
            title="Delete location"
          >
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--muted)]">
                Delete{" "}
                <span className="font-semibold text-[var(--foreground)]">{deletingLocation?.name ?? "this location"}</span>?
                This cannot be undone.
              </p>
              {deleteError ? <p className="text-sm text-[#b42318]">{deleteError}</p> : null}
              <div className="flex justify-end gap-2">
                <Button
                  disabled={isDeleting}
                  onClick={() => {
                    setDeletingLocation(null);
                    setDeleteError("");
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button disabled={isDeleting} onClick={handleDeleteLocation} type="button" variant="danger">
                  {isDeleting ? "Deleting..." : "Delete location"}
                </Button>
              </div>
            </div>
          </Modal>
        </section>

        {!selectedLocation ? (
          <EmptyState
            description={
              locations.length
                ? "Select a saved location above to view its current and forecast weather."
                : "Add a location with its latitude and longitude to start monitoring weather."
            }
            title={locations.length ? "No location selected" : "No saved locations yet"}
          />
        ) : (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
                  {formatNumber(selectedLocation.latitude, 4)}, {formatNumber(selectedLocation.longitude, 4)}
                </p>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  {selectedLocation.name}
                </h2>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-[#f1f4f2] p-1">
                {FORECAST_DAY_OPTIONS.map((option) => (
                  <button
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition",
                      days === option
                        ? "bg-white text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                    key={option}
                    onClick={() => selectDays(option)}
                    type="button"
                  >
                    {option} days
                  </button>
                ))}
              </div>
            </div>

            {weatherError ? (
              <div className="rounded-md border border-[#f3c7c2] bg-[#fff5f3] p-4 text-sm text-[#9f2d24]">
                {weatherError}
              </div>
            ) : null}
            {report?.warning ? (
              <div className="rounded-md border border-[#efd6ad] bg-[#fff9ee] p-4 text-sm text-[#85531c]">
                {report.warning}
              </div>
            ) : null}

            {weatherLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner label="Loading weather" />
              </div>
            ) : current ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard
                    accent="bg-[#fff0e8] text-[#b54b1f]"
                    icon={Thermometer}
                    items={[
                      { label: "Feels like", value: formatMetric(current.apparentTemperature, "°C") },
                      { label: "Condition", value: current.weatherLabel || "N/A" },
                    ]}
                    title="Temperature"
                    value={formatMetric(current.temperature, "°C")}
                  />
                  <KpiCard
                    accent="bg-[#e8f4fa] text-[#1677a8]"
                    icon={CloudSun}
                    items={[
                      {
                        label: "Probability",
                        value: formatMetric(todayDaily?.precipitationProbabilityMax, "%", 0),
                      },
                      { label: "Total today", value: formatMetric(todayDaily?.rainSum, "mm") },
                    ]}
                    title="Rainfall"
                    value={formatMetric(current.rain, "mm")}
                  />
                  <KpiCard
                    accent="bg-[#e9f5ef] text-[#2d7a57]"
                    icon={Droplets}
                    items={[{ label: "Precipitation", value: formatMetric(current.precipitation, "mm") }]}
                    title="Humidity"
                    value={formatMetric(current.relativeHumidity, "%", 0)}
                  />
                  <KpiCard
                    accent="bg-[#f0edfa] text-[#6e57a5]"
                    icon={Wind}
                    items={[
                      { label: "Direction", value: directionLabel(current.windDirection) },
                      { label: "Max today", value: formatMetric(todayDaily?.windSpeedMax, "km/h") },
                    ]}
                    title="Wind"
                    value={formatMetric(current.windSpeed, "km/h")}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold">Forecast</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
                    {daily.map((day, index) => (
                      <ForecastDayCard day={day} isToday={index === 0} key={day.date} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState description="Could not load weather for this location yet." title="No weather data" />
            )}
          </section>
        )}
      </PageShell>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-6xl px-4 py-8">Loading weather monitor...</main>}>
      <WeatherMonitor />
    </Suspense>
  );
}
