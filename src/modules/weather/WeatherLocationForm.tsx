"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WeatherLocationInput } from "@/lib/weather";

type WeatherLocationFormProps = {
  initialValues?: WeatherLocationInput;
  mode?: "create" | "edit";
  onCancel: () => void;
  onSubmit: (input: WeatherLocationInput) => Promise<void>;
};

export function WeatherLocationForm({ initialValues, mode = "create", onCancel, onSubmit }: WeatherLocationFormProps) {
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latitude, setLatitude] = useState(initialValues ? String(initialValues.latitude) : "");
  const [longitude, setLongitude] = useState(initialValues ? String(initialValues.longitude) : "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const isEditing = mode === "edit";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const latitudeValue = Number(latitude);
    const longitudeValue = Number(longitude);
    const nextFieldErrors: Record<string, string> = {};

    if (!trimmedName) {
      nextFieldErrors.name = "Location name is required.";
    }
    if (!latitude.trim() || Number.isNaN(latitudeValue) || latitudeValue < -90 || latitudeValue > 90) {
      nextFieldErrors.latitude = "Enter a latitude between -90 and 90.";
    }
    if (!longitude.trim() || Number.isNaN(longitudeValue) || longitudeValue < -180 || longitudeValue > 180) {
      nextFieldErrors.longitude = "Enter a longitude between -180 and 180.";
    }

    setError("");
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        latitude: latitudeValue,
        longitude: longitudeValue,
        name: trimmedName,
      });

      if (!isEditing) {
        setName("");
        setLatitude("");
        setLongitude("");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : isEditing
            ? "Could not update location."
            : "Could not add location.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        error={fieldErrors.name}
        label="Location name"
        name="name"
        onChange={(event) => setName(event.target.value)}
        placeholder="Siem Reap"
        value={name}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          error={fieldErrors.latitude}
          label="Latitude"
          name="latitude"
          onChange={(event) => setLatitude(event.target.value)}
          placeholder="13.366865"
          step="any"
          type="number"
          value={latitude}
        />
        <Input
          error={fieldErrors.longitude}
          label="Longitude"
          name="longitude"
          onChange={(event) => setLongitude(event.target.value)}
          placeholder="103.9538235"
          step="any"
          type="number"
          value={longitude}
        />
      </div>

      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? (isEditing ? "Saving..." : "Adding...") : isEditing ? "Save location" : "Add location"}
        </Button>
      </div>
    </form>
  );
}
