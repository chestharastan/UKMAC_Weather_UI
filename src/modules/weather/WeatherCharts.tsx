"use client";

import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  WeatherDataType,
  WeatherHourlyPoint,
  WeatherMetricKey,
  WeatherRecord,
} from "@/modules/weather/weather.types";

type SeriesDefinition = {
  color: string;
  key: WeatherMetricKey;
  label: string;
  unit?: string;
};

type ChartDatum = Record<string, number | string | null> & {
  dataType: WeatherDataType;
  date: string;
};

type ChartPanelProps = {
  children: ReactNode;
  description?: string;
  title: ReactNode;
};

const GRID_COLOR = "#e7ece8";
const AXIS_COLOR = "#738078";
const FORECAST_FILL = "#f2f8f7";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function longDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function valueLabel(value: number | null, unit: string) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: unit === "kPa" ? 3 : 1,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function signedValueLabel(value: number | null, unit: string) {
  const formatted = valueLabel(value, unit);
  return value !== null && value > 0 ? `+${formatted}` : formatted;
}

function buildLineData(
  records: WeatherRecord[],
  series: SeriesDefinition[],
  today: string,
) {
  const rows: ChartDatum[] = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const row: ChartDatum = {
        dataType: record.dataType,
        date: record.date,
      };

      for (const item of series) {
        const value = record[item.key];
        row[item.key] = value;
        row[`${item.key}Historical`] =
          record.dataType === "historical" ? value : null;
        row[`${item.key}Forecast`] =
          record.dataType === "forecast" ? value : null;
      }
      return row;
    });

  // Weather syncs usually have no same-day "historical" record yet (today's
  // row is already dataType "forecast"), so the naive historical/forecast
  // split made the dashed line start a day early, visibly crossing the TODAY
  // marker instead of starting at it. Bridge the solid line forward to
  // whichever row lands on (or first reaches) today, so solid ends exactly
  // at TODAY and only strictly-future days render dashed.
  const todayIndex = rows.findIndex((row) => row.date >= today);
  if (todayIndex > 0) {
    const todayRow = rows[todayIndex];
    for (const item of series) {
      if (todayRow[`${item.key}Historical`] === null) {
        todayRow[`${item.key}Historical`] = todayRow[item.key];
      }
    }
  } else if (todayIndex === -1) {
    const firstForecastIndex = rows.findIndex(
      (row) => row.dataType === "forecast",
    );
    if (firstForecastIndex > 0) {
      const previous = rows[firstForecastIndex - 1];
      for (const item of series) {
        previous[`${item.key}Forecast`] = previous[item.key];
      }
    }
  }
  return rows;
}

function ForecastArea({ data, today }: { data: ChartDatum[]; today: string }) {
  const forecastEnd = [...data]
    .reverse()
    .find((row) => row.dataType === "forecast")?.date;

  return forecastEnd ? (
    <ReferenceArea
      fill={FORECAST_FILL}
      ifOverflow="visible"
      x1={today}
      x2={forecastEnd}
    />
  ) : null;
}

function TodayLine({ today }: { today: string }) {
  return (
    <ReferenceLine
      label={{
        fill: "#0f766e",
        fontSize: 10,
        fontWeight: 700,
        position: "insideTopRight",
        value: "TODAY",
      }}
      stroke="#0f766e"
      strokeDasharray="3 3"
      strokeWidth={1.5}
      x={today}
    />
  );
}

function SeriesLegend({
  series,
}: {
  series: Array<{ color: string; key: string; label: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-[var(--muted)]">
      {series.map((item) => (
        <span className="inline-flex items-center gap-1.5" key={item.key}>
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[var(--muted)]">
      <span className="inline-flex items-center gap-2">
        <span className="h-0.5 w-7 bg-[#46635a]" /> Past
      </span>
      <span className="inline-flex items-center gap-2 text-[var(--accent)]">
        <span className="h-4 border-l border-dashed border-[var(--accent)]" />{" "}
        Today
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="w-7 border-t-2 border-dashed border-[#46635a]" />{" "}
        Forecast
      </span>
    </div>
  );
}

function WeatherTooltip({
  active,
  datum,
  series,
}: {
  active?: boolean;
  datum?: ChartDatum;
  series: SeriesDefinition[];
}) {
  if (!active || !datum) return null;

  const isForecast = datum.dataType === "forecast";

  return (
    <div
      className="pointer-events-none min-w-[18rem] rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_16px_36px_rgba(24,39,31,0.14)]"
      role="tooltip"
    >
      <div className="flex items-center justify-between gap-5">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {longDateLabel(datum.date)}
        </p>
        <span
          className={
            isForecast
              ? "text-[11px] font-bold uppercase tracking-wide text-[#6e57a5]"
              : "text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]"
          }
        >
          {isForecast ? "Forecast" : "Historical"}
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {series.map((item) => (
          <div
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm"
            key={item.key}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-[var(--muted)]">{item.label}</span>
            <span className="font-bold tabular-nums text-[var(--foreground)]">
              {valueLabel(datum[item.key] as number | null, item.unit ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartPanel({ children, description, title }: ChartPanelProps) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function HistoricalForecastLineChart({
  emptyMessage = "No data available",
  height = 280,
  records,
  series,
  today,
  todayMarker = true,
  tooltipSeries = [],
  yAxisLabel,
}: {
  emptyMessage?: string;
  height?: number;
  records: WeatherRecord[];
  series: SeriesDefinition[];
  today: string;
  todayMarker?: boolean;
  tooltipSeries?: SeriesDefinition[];
  yAxisLabel: string;
}) {
  const allSeries = [...series, ...tooltipSeries];
  const data = buildLineData(records, allSeries, today);
  const hasData = data.some((row) =>
    series.some((item) => typeof row[item.key] === "number"),
  );

  if (!hasData) {
    return (
      <div className="flex h-52 items-center justify-center rounded-md bg-[#f7f9f7] text-sm font-medium text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <SeriesLegend series={series} />
        {todayMarker ? <StatusLegend /> : null}
      </div>
      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={data}
            margin={{ bottom: 4, left: 2, right: 16, top: 12 }}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            {todayMarker ? <ForecastArea data={data} today={today} /> : null}
            <XAxis
              axisLine={{ stroke: GRID_COLOR }}
              dataKey="date"
              minTickGap={28}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickFormatter={dateLabel}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              label={{
                angle: -90,
                fill: AXIS_COLOR,
                fontSize: 10,
                position: "insideLeft",
                value: yAxisLabel,
              }}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              width={48}
            />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              content={({ active, payload }) => (
                <WeatherTooltip
                  active={active}
                  datum={
                    payload?.find((item) => item.payload)?.payload as
                      ChartDatum | undefined
                  }
                  series={allSeries}
                />
              )}
              cursor={{
                stroke: "#9fb3aa",
                strokeDasharray: "4 4",
                strokeWidth: 1.5,
              }}
              isAnimationActive={false}
              offset={18}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
            />
            {todayMarker ? <TodayLine today={today} /> : null}
            {todayMarker
              ? series.flatMap((item) => [
                  <Line
                    activeDot={{
                      fill: item.color,
                      r: 5,
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    dataKey={`${item.key}Historical`}
                    dot={false}
                    isAnimationActive={false}
                    key={`${item.key}-historical`}
                    name={`${item.label} (Historical)`}
                    stroke={item.color}
                    strokeWidth={2.25}
                    type="monotone"
                  />,
                  <Line
                    activeDot={{
                      fill: item.color,
                      r: 5,
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    dataKey={`${item.key}Forecast`}
                    dot={false}
                    isAnimationActive={false}
                    key={`${item.key}-forecast`}
                    name={`${item.label} (Forecast)`}
                    stroke={item.color}
                    strokeDasharray="6 5"
                    strokeWidth={2.25}
                    type="monotone"
                  />,
                ])
              : series.map((item) => (
                  <Line
                    activeDot={{
                      fill: item.color,
                      r: 5,
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    dataKey={item.key}
                    dot={false}
                    isAnimationActive={false}
                    key={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2.25}
                    type="monotone"
                  />
                ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RainfallChart({
  records,
  today,
  todayMarker = true,
}: {
  records: WeatherRecord[];
  today: string;
  todayMarker?: boolean;
}) {
  const series: SeriesDefinition[] = [
    { color: "#1677a8", key: "rain_sum", label: "Rainfall", unit: "mm" },
    {
      color: "#6e57a5",
      key: "precipitation_probability_max",
      label: "Rain probability",
      unit: "%",
    },
  ];
  const data = buildLineData(records, series, today);
  const hasRain = data.some((row) => typeof row.rain_sum === "number");

  if (!hasRain) {
    return (
      <div className="py-16 text-center text-sm text-[var(--muted)]">
        No rainfall data
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <SeriesLegend series={series} />
        {todayMarker ? <StatusLegend /> : null}
      </div>
      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart
            data={data}
            margin={{ bottom: 4, left: 2, right: 10, top: 12 }}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            {todayMarker ? <ForecastArea data={data} today={today} /> : null}
            <XAxis
              axisLine={{ stroke: GRID_COLOR }}
              dataKey="date"
              minTickGap={28}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickFormatter={dateLabel}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              unit=" mm"
              width={54}
              yAxisId="rain"
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              orientation="right"
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              unit="%"
              width={38}
              yAxisId="probability"
            />
            <Tooltip
              allowEscapeViewBox={{ x: false, y: true }}
              content={({ active, payload }) => (
                <WeatherTooltip
                  active={active}
                  datum={
                    payload?.find((item) => item.payload)?.payload as
                      ChartDatum | undefined
                  }
                  series={series}
                />
              )}
              cursor={{
                fill: "rgba(159, 179, 170, 0.08)",
                stroke: "#9fb3aa",
                strokeDasharray: "4 4",
                strokeWidth: 1,
              }}
              isAnimationActive={false}
              offset={18}
              wrapperStyle={{ outline: "none", zIndex: 20 }}
            />
            {todayMarker ? <TodayLine today={today} /> : null}
            {todayMarker ? (
              <>
                <Bar
                  dataKey="rain_sumHistorical"
                  fill="#1677a8"
                  isAnimationActive={false}
                  maxBarSize={28}
                  name="Rainfall (Historical)"
                  radius={[3, 3, 0, 0]}
                  yAxisId="rain"
                />
                <Bar
                  dataKey="rain_sumForecast"
                  fill="#72aac3"
                  fillOpacity={0.62}
                  isAnimationActive={false}
                  maxBarSize={28}
                  name="Rainfall (Forecast)"
                  radius={[3, 3, 0, 0]}
                  stroke="#1677a8"
                  strokeDasharray="3 2"
                  yAxisId="rain"
                />
                <Line
                  activeDot={{
                    fill: "#6e57a5",
                    r: 5,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  dataKey="precipitation_probability_maxForecast"
                  dot={{ fill: "#6e57a5", r: 2 }}
                  isAnimationActive={false}
                  name="Rain probability (Forecast)"
                  stroke="#6e57a5"
                  strokeDasharray="6 5"
                  strokeWidth={2}
                  type="monotone"
                  yAxisId="probability"
                />
              </>
            ) : (
              <>
                <Bar
                  dataKey="rain_sum"
                  fill="#1677a8"
                  isAnimationActive={false}
                  maxBarSize={28}
                  name="Rainfall"
                  radius={[3, 3, 0, 0]}
                  yAxisId="rain"
                />
                <Line
                  activeDot={{
                    fill: "#6e57a5",
                    r: 5,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  dataKey="precipitation_probability_max"
                  dot={{ fill: "#6e57a5", r: 2 }}
                  isAnimationActive={false}
                  name="Rain probability"
                  stroke="#6e57a5"
                  strokeWidth={2}
                  type="monotone"
                  yAxisId="probability"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HourlyRainfallChart({
  points,
}: {
  points: WeatherHourlyPoint[];
}) {
  const data = points.map((point) => ({
    ...point,
    label: point.time.slice(11, 16),
  }));
  const hasData = data.some(
    (point) =>
      typeof point.rain === "number" ||
      typeof point.precipitationProbability === "number",
  );

  if (!hasData) {
    return (
      <div className="flex h-52 items-center justify-center rounded-md bg-[#f7f9f7] text-sm font-medium text-[var(--muted)]">
        No hourly rainfall data
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#1677a8]" /> Rainfall (mm)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-[#6e57a5]" /> Rain probability (%)
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart
            data={data}
            margin={{ bottom: 4, left: 0, right: 4, top: 8 }}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              axisLine={{ stroke: GRID_COLOR }}
              dataKey="label"
              interval="preserveStartEnd"
              tick={{ fill: AXIS_COLOR, fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: AXIS_COLOR, fontSize: 10 }}
              tickLine={false}
              unit=" mm"
              width={48}
              yAxisId="rain"
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              orientation="right"
              tick={{ fill: AXIS_COLOR, fontSize: 10 }}
              tickLine={false}
              unit="%"
              width={36}
              yAxisId="probability"
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  (typeof data)[number] | undefined;

                if (!active || !point) return null;

                return (
                  <div className="min-w-44 rounded-md border border-[var(--line)] bg-white p-3 shadow-md">
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      {point.label}
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p className="flex justify-between gap-4">
                        <span className="text-[var(--muted)]">Rainfall</span>
                        <strong>{valueLabel(point.rain, "mm")}</strong>
                      </p>
                      <p className="flex justify-between gap-4">
                        <span className="text-[var(--muted)]">Probability</span>
                        <strong>
                          {valueLabel(point.precipitationProbability, "%")}
                        </strong>
                      </p>
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: "#a8b9b1", strokeDasharray: "3 3" }}
            />
            <Bar
              dataKey="rain"
              fill="#1677a8"
              isAnimationActive={false}
              maxBarSize={20}
              name="Rainfall"
              radius={[3, 3, 0, 0]}
              yAxisId="rain"
            />
            <Line
              dataKey="precipitationProbability"
              dot={{ fill: "#6e57a5", r: 2 }}
              isAnimationActive={false}
              name="Rain probability"
              stroke="#6e57a5"
              strokeWidth={2}
              type="monotone"
              yAxisId="probability"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function WaterBalanceChart({
  records,
  today,
  todayMarker = true,
}: {
  records: WeatherRecord[];
  today: string;
  todayMarker?: boolean;
}) {
  const baseSeries: SeriesDefinition[] = [
    { color: "#1677a8", key: "rain_sum", label: "Rain", unit: "mm" },
    {
      color: "#c27a2c",
      key: "et0_fao_evapotranspiration",
      label: "ET₀",
      unit: "mm",
    },
  ];
  const legendSeries = [
    ...baseSeries,
    { color: "#3e6255", key: "waterBalance", label: "Balance" },
  ];
  const data = buildLineData(records, baseSeries, today).map((row) => {
    const rain = row.rain_sum as number | null;
    const et0 = row.et0_fao_evapotranspiration as number | null;
    const balance = rain === null || et0 === null ? null : rain - et0;
    return {
      ...row,
      waterBalance: balance,
      waterBalanceForecast: row.dataType === "forecast" ? balance : null,
      waterBalanceHistorical: row.dataType === "historical" ? balance : null,
    };
  });
  // Same today-anchored bridge as buildLineData: solid ends at TODAY, dashed
  // starts at TODAY, instead of at whatever the last historical-labeled row is.
  const todayIndex = data.findIndex((row) => row.date >= today);
  if (todayIndex > 0) {
    if (data[todayIndex].waterBalanceHistorical === null) {
      data[todayIndex].waterBalanceHistorical = data[todayIndex].waterBalance;
    }
  } else if (todayIndex === -1) {
    const firstForecastIndex = data.findIndex(
      (row) => row.dataType === "forecast",
    );
    if (firstForecastIndex > 0) {
      data[firstForecastIndex - 1].waterBalanceForecast =
        data[firstForecastIndex - 1].waterBalance;
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <SeriesLegend series={legendSeries} />
        {todayMarker ? <StatusLegend /> : null}
      </div>
      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart
            data={data}
            margin={{ bottom: 4, left: 2, right: 12, top: 12 }}
          >
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            {todayMarker ? <ForecastArea data={data} today={today} /> : null}
            <XAxis
              axisLine={{ stroke: GRID_COLOR }}
              dataKey="date"
              minTickGap={28}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickFormatter={dateLabel}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              unit=" mm"
              width={54}
            />
            <Tooltip
              content={({ active, payload }) => {
                const datum = payload?.[0]?.payload as ChartDatum | undefined;
                if (!active || !datum) return null;
                return (
                  <div className="min-w-48 rounded-md border border-[var(--line)] bg-white p-3 shadow-md">
                    <div className="flex justify-between gap-4 text-xs font-semibold">
                      <span>{longDateLabel(datum.date)}</span>
                      <span className="text-[10px] uppercase text-[var(--accent)]">
                        {datum.dataType}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <p>
                        Rain:{" "}
                        <strong>
                          {valueLabel(datum.rain_sum as number | null, "mm")}
                        </strong>
                      </p>
                      <p>
                        ET₀:{" "}
                        <strong>
                          {valueLabel(
                            datum.et0_fao_evapotranspiration as number | null,
                            "mm",
                          )}
                        </strong>
                      </p>
                      <p>
                        Difference:{" "}
                        <strong>
                          {signedValueLabel(
                            datum.waterBalance as number | null,
                            "mm",
                          )}
                        </strong>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            {todayMarker ? <TodayLine today={today} /> : null}
            {todayMarker ? (
              <>
                <Bar
                  dataKey="rain_sumHistorical"
                  fill="#1677a8"
                  isAnimationActive={false}
                  maxBarSize={18}
                  name="Rain (Historical)"
                />
                <Bar
                  dataKey="rain_sumForecast"
                  fill="#72aac3"
                  fillOpacity={0.62}
                  isAnimationActive={false}
                  maxBarSize={18}
                  name="Rain (Forecast)"
                  stroke="#1677a8"
                  strokeDasharray="3 2"
                />
                <Bar
                  dataKey="et0_fao_evapotranspirationHistorical"
                  fill="#c27a2c"
                  isAnimationActive={false}
                  maxBarSize={18}
                  name="ET₀ (Historical)"
                />
                <Bar
                  dataKey="et0_fao_evapotranspirationForecast"
                  fill="#e1b47c"
                  fillOpacity={0.62}
                  isAnimationActive={false}
                  maxBarSize={18}
                  name="ET₀ (Forecast)"
                  stroke="#c27a2c"
                  strokeDasharray="3 2"
                />
                <Line
                  dataKey="waterBalanceHistorical"
                  dot={false}
                  isAnimationActive={false}
                  name="Balance (Historical)"
                  stroke="#3e6255"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="waterBalanceForecast"
                  dot={false}
                  isAnimationActive={false}
                  name="Balance (Forecast)"
                  stroke="#3e6255"
                  strokeDasharray="6 5"
                  strokeWidth={2}
                  type="monotone"
                />
              </>
            ) : (
              <>
                <Bar
                  dataKey="rain_sum"
                  fill="#1677a8"
                  isAnimationActive={false}
                  maxBarSize={18}
                  name="Rain"
                />
                <Bar
                  dataKey="et0_fao_evapotranspiration"
                  fill="#c27a2c"
                  isAnimationActive={false}
                  maxBarSize={18}
                  name="ET₀"
                />
                <Line
                  dataKey="waterBalance"
                  dot={false}
                  isAnimationActive={false}
                  name="Balance"
                  stroke="#3e6255"
                  strokeWidth={2}
                  type="monotone"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
