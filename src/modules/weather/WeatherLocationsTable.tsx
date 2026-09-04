import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils/cn";
import type { WeatherLocation } from "@/lib/weather";

type WeatherLocationsTableProps = {
  isLoading?: boolean;
  locations: WeatherLocation[];
  onSelect: (location: WeatherLocation) => void;
  selectedLocationId: string;
};

export function WeatherLocationsTable({
  isLoading,
  locations,
  onSelect,
  selectedLocationId,
}: WeatherLocationsTableProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-1.5 rounded-md border border-[var(--line)] bg-white p-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <span className="h-10 animate-pulse rounded-md bg-black/[0.05]" key={index} />
        ))}
      </div>
    );
  }

  if (!locations.length) {
    return <EmptyState description="No locations have been added yet." title="No saved locations" />;
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-md border border-[var(--line)] bg-white p-2 sm:grid-cols-3 lg:grid-cols-4">
      {locations.map((location) => {
        const isSelected = location.id === selectedLocationId;

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "h-10 min-w-0 rounded-md border px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
              isSelected
                ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm"
                : "border-[var(--line)] bg-white hover:border-[var(--line-strong)] hover:bg-[#f8faf9]",
            )}
            key={location.id}
            onClick={() => onSelect(location)}
            type="button"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-xs font-semibold text-[var(--foreground)]">{location.name}</span>
              <span
                aria-hidden
                className={cn("h-2.5 w-2.5 shrink-0 rounded-full", isSelected ? "bg-[var(--accent)]" : "bg-[#c8d1cc]")}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
