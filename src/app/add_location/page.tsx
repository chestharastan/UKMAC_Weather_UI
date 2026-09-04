"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createWeatherLocation, type WeatherLocation, type WeatherLocationInput } from "@/lib/weather";
import { WeatherLocationForm } from "@/modules/weather/WeatherLocationForm";

export default function AddLocationPage() {
  const router = useRouter();
  const [addedLocations, setAddedLocations] = useState<WeatherLocation[]>([]);

  async function handleSubmit(input: WeatherLocationInput) {
    const created = await createWeatherLocation(input);
    setAddedLocations((current) => [created, ...current]);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Add weather location</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">
          Enter a coordinate to add it to the dashboard. This page is not linked from the dashboard.
        </p>

        <div className="mt-5">
          <WeatherLocationForm onCancel={() => router.push("/")} onSubmit={handleSubmit} />
        </div>
      </div>

      {addedLocations.length ? (
        <div className="mt-4 space-y-2">
          {addedLocations.map((location) => (
            <div
              className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-strong)]"
              key={location.id}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Added <strong>{location.name}</strong> ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)})
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm">
        <Link className="font-semibold text-[var(--accent-strong)] hover:underline" href="/">
          View dashboard
        </Link>
      </p>
    </main>
  );
}
