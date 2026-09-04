import { Table } from "@/components/ui/Table";
import { cn } from "@/lib/utils/cn";
import type { WeatherLocation } from "@/lib/weather";
import { WeatherLocationRowMenu } from "@/modules/weather/WeatherLocationRowMenu";

type WeatherLocationsTableProps = {
  isLoading?: boolean;
  locations: WeatherLocation[];
  onDelete: (location: WeatherLocation) => void;
  onEdit: (location: WeatherLocation) => void;
  onSelect: (location: WeatherLocation) => void;
  selectedLocationId: string;
};

export function WeatherLocationsTable({
  isLoading,
  locations,
  onDelete,
  onEdit,
  onSelect,
  selectedLocationId,
}: WeatherLocationsTableProps) {
  return (
    <Table
      columns={[
        {
          header: "Location",
          key: "name",
          render: (location) => (
            <span className="font-medium text-[var(--foreground)]">{location.name}</span>
          ),
        },
        {
          header: "Latitude",
          key: "latitude",
          render: (location) => location.latitude.toFixed(6),
        },
        {
          header: "Longitude",
          key: "longitude",
          render: (location) => location.longitude.toFixed(6),
        },
        {
          header: "Actions",
          key: "actions",
          render: (location) => (
            <WeatherLocationRowMenu
              location={location}
              onDelete={() => onDelete(location)}
              onEdit={() => onEdit(location)}
            />
          ),
        },
      ]}
      emptyState={{
        description: "Add a location with its latitude and longitude to start monitoring weather for it.",
        title: "No saved locations",
      }}
      isLoading={isLoading}
      onRowClick={onSelect}
      rowClassName={(location) =>
        cn(location.id === selectedLocationId && "bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]")
      }
      rowKey={(location) => location.id}
      rows={locations}
    />
  );
}
