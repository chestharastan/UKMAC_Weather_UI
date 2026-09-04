"use client";

import { Search } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageShell } from "@/components/shared/PageShell";
import { listWeatherLocations, type WeatherLocation } from "@/lib/weather";
import { WeatherDashboardPanel } from "@/modules/weather/WeatherDashboardPanel";
import { WeatherLocationsTable } from "@/modules/weather/WeatherLocationsTable";

function WeatherMonitor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [locations, setLocations] = useState<WeatherLocation[]>([]);
  const [locationsError, setLocationsError] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  useEffect(() => {
    setSelectedLocationId(searchParams.get("location") || "");
  }, [searchParams]);

  function updateSearchParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
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

  function selectLocation(location: WeatherLocation) {
    const nextLocationId = location.id === selectedLocationId ? "" : location.id;
    setSelectedLocationId(nextLocationId);
    updateSearchParams({ location: nextLocationId || null });
  }

  function updateDateRange(startDate: string, endDate: string) {
    updateSearchParams({ end: endDate, start: startDate });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageShell
        description="Monitor current and forecast conditions for farm and water management."
        title="Weather Dashboard"
      >
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--muted)]">Saved locations</h2>
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
          </div>

          <WeatherLocationsTable
            isLoading={locationsLoading}
            locations={filteredLocations}
            onSelect={selectLocation}
            selectedLocationId={selectedLocationId}
          />
          {locationsError ? <p className="text-sm text-[#b42318]">{locationsError}</p> : null}
        </section>

        {!selectedLocation ? (
          <EmptyState
            description={
              locations.length
                ? "Select a saved location above to view its current and forecast weather."
                : "No locations have been added yet."
            }
            title={locations.length ? "No location selected" : "No saved locations yet"}
          />
        ) : (
          <WeatherDashboardPanel
            initialEndDate={searchParams.get("end") || undefined}
            initialStartDate={searchParams.get("start") || undefined}
            location={selectedLocation}
            onDateRangeChange={updateDateRange}
          />
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
