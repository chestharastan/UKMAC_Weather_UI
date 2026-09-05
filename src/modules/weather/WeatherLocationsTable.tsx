import { Check, MapPin } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { WeatherLocation } from "@/lib/weather";

type WeatherLocationsTableProps = {
  isLoading?: boolean;
  locations: WeatherLocation[];
  onSelect?: (location: WeatherLocation) => void;
  selectedLocationId: string;
};

export function WeatherLocationsTable({
  isLoading,
  locations,
  onSelect,
  selectedLocationId,
}: WeatherLocationsTableProps) {
  if (isLoading || !locations.length) {
    return (
      <div className="grid grid-cols-3 gap-2" aria-label="Loading locations" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <span className="h-12 animate-pulse rounded-md bg-black/[0.05]" key={index} />
        ))}
      </div>
    );
  }

  return (
    <div aria-label="Saved locations" className="grid grid-cols-3 gap-2" role="group">
      {locations.map((location) => {
        const isSelected = location.id === selectedLocationId;
        const className = cn(
          "flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-md border px-2 py-2 text-center transition sm:justify-start sm:px-4 sm:text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          isSelected
            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm"
            : "border-[var(--line)] bg-white hover:border-[var(--line-strong)] hover:bg-[#f8faf9]",
        );
        const content = (
          <>
            <MapPin aria-hidden className="hidden h-4 w-4 shrink-0 text-[var(--accent)] sm:block" />
            <span className="text-xs font-semibold text-[var(--foreground)] sm:text-sm">{location.name}</span>
            <Check aria-hidden className={cn("ml-auto hidden h-4 w-4 shrink-0 text-[var(--accent)] sm:block", !isSelected && "invisible")} />
          </>
        );

        return onSelect ? (
          <button
            aria-pressed={isSelected}
            className={className}
            key={location.id}
            onClick={() => onSelect(location)}
            type="button"
          >
            {content}
          </button>
        ) : (
          <a className={className} href={`?location=${encodeURIComponent(location.id)}`} key={location.id}>
            {content}
          </a>
        );
      })}
    </div>
  );
}
