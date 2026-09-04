import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react";

export function conditionLabel(code: number | null | undefined) {
  if (code === null || code === undefined) return "Unavailable";
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Mixed weather";
}

export function ConditionIcon({ code, className }: { code: number | null | undefined; className?: string }) {
  if (code === null || code === undefined) return <Cloud className={className} />;
  if ([95, 96, 99].includes(code)) return <CloudLightning className={className} />;
  if ([45, 48].includes(code)) return <CloudFog className={className} />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return <CloudRain className={className} />;
  }
  if ([1, 2].includes(code)) return <CloudSun className={className} />;
  return code === 0 ? <Sun className={className} /> : <Cloud className={className} />;
}

export function directionLabel(degrees: number | null | undefined) {
  if (degrees === null || degrees === undefined || !Number.isFinite(degrees)) return "N/A";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}
