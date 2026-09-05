"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageShell } from "@/components/shared/PageShell";
import { listWeatherLocations, SAVED_LOCATIONS, type WeatherLocation } from "@/lib/weather";
import { DashboardSkeleton, WeatherDashboardPanel } from "@/modules/weather/WeatherDashboardPanel";
import { WeatherLocationsTable } from "@/modules/weather/WeatherLocationsTable";

function WeatherPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageShell
        description="Monitor current and forecast conditions for farm and water management."
        title="Weather Dashboard"
      >
        {children}
      </PageShell>
    </main>
  );
}

function WeatherMonitor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [locations, setLocations] = useState<WeatherLocation[]>(SAVED_LOCATIONS);
  const [locationsError, setLocationsError] = useState("");

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
    setLocationsError("");
    try {
      const nextLocations = await listWeatherLocations();
      setLocations(nextLocations.length ? nextLocations : SAVED_LOCATIONS);
      return nextLocations;
    } catch (error) {
      setLocationsError(error instanceof Error ? error.message : "Could not load saved locations.");
      return [];
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const selectedLocation = locations.find((location) => location.id === searchParams.get("location")) ?? locations[0] ?? null;
  const selectedLocationId = selectedLocation?.id ?? "";

  function selectLocation(location: WeatherLocation) {
    updateSearchParams({ location: location.id });
  }

  function updateDateRange(startDate: string, endDate: string) {
    updateSearchParams({ end: endDate, start: startDate });
  }

  return (
    <WeatherPageShell>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--muted)]">Saved locations</h2>

        <WeatherLocationsTable
          locations={locations}
          onSelect={selectLocation}
          selectedLocationId={selectedLocationId}
        />
        {locationsError ? <p className="text-sm text-[#b42318]">{locationsError}</p> : null}
      </section>

      {!selectedLocation ? (
        <DashboardSkeleton />
      ) : (
        <WeatherDashboardPanel
          initialEndDate={searchParams.get("end") || undefined}
          initialStartDate={searchParams.get("start") || undefined}
          location={selectedLocation}
          onDateRangeChange={updateDateRange}
        />
      )}
    </WeatherPageShell>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <WeatherPageShell>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--muted)]">Saved locations</h2>
            <WeatherLocationsTable locations={SAVED_LOCATIONS} selectedLocationId="" />
          </section>
          <DashboardSkeleton />
        </WeatherPageShell>
      }
    >
      <WeatherMonitor />
    </Suspense>
  );
}
