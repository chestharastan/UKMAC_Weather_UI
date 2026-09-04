"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

type CalendarDatePickerProps = {
  disabled?: boolean;
  error?: string;
  helperText?: string;
  label?: string;
  max?: string;
  min?: string;
  name?: string;
  onChange: (value: string) => void;
  value: string;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  if (!value) return "";

  const date = fromIsoDate(value);

  // A value that isn't a plain "YYYY-MM-DD" string (malformed input, an
  // unexpected prop) produces an Invalid Date, which Intl.DateTimeFormat
  // throws on rather than returning a fallback string for — show the raw
  // value instead of crashing the picker.
  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

type MonthCell = { date: Date; isoValue: string } | null;

function buildMonthGrid(viewMonth: Date): MonthCell[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, isoValue: toIsoDate(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const POPOVER_WIDTH = 288;

export function CalendarDatePicker({
  disabled,
  error,
  helperText,
  label,
  max,
  min,
  name,
  onChange,
  value,
}: CalendarDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => (value ? fromIsoDate(value) : new Date()));
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function updateMenuPosition() {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverHeight = popoverRef.current?.offsetHeight ?? 340;
    const gap = 8;
    const margin = 12;
    const maxLeft = window.innerWidth - POPOVER_WIDTH - margin;
    let left = Math.max(margin, Math.min(triggerRect.left, maxLeft));
    let top = triggerRect.bottom + gap;

    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    if (spaceBelow < popoverHeight + gap + margin && spaceAbove > spaceBelow) {
      top = Math.max(margin, triggerRect.top - popoverHeight - gap);
    }

    setMenuPosition({ left, top });
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedField = fieldRef.current?.contains(target);
      const clickedPopover = popoverRef.current?.contains(target);
      if (!clickedField && !clickedPopover) setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, viewMonth]);

  const minDate = min ? fromIsoDate(min) : undefined;
  const maxDate = max ? fromIsoDate(max) : undefined;
  const today = new Date();

  const prevMonthDisabled = minDate ? isSameMonth(viewMonth, minDate) : false;
  const nextMonthDisabled = maxDate ? isSameMonth(viewMonth, maxDate) : false;

  const cells = buildMonthGrid(viewMonth);
  const inputId = name ? `${name}-calendar` : undefined;

  function handleToggleOpen() {
    if (!isOpen && value) setViewMonth(fromIsoDate(value));
    updateMenuPosition();
    setIsOpen((current) => !current);
  }

  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-sm font-medium tracking-[-0.01em]" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <div className="relative" ref={fieldRef}>
        <button
          aria-expanded={isOpen}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-md border border-[var(--line)] bg-[#fbfbfc] px-3 text-sm text-[var(--foreground)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:bg-white focus:ring-4 focus:ring-[var(--accent-soft)]",
            value && !disabled && "pr-9",
            error && "border-[#d70015] focus:border-[#d70015] focus:ring-[#ffd7d9]",
            disabled && "cursor-not-allowed opacity-60",
          )}
          disabled={disabled}
          id={inputId}
          onClick={handleToggleOpen}
          ref={triggerRef}
          type="button"
        >
          <span className={value ? "" : "text-[#9aa6a1]"}>{value ? formatDisplayDate(value) : "Select date"}</span>
          <CalendarDays className="h-4 w-4 text-[#74747d]" />
        </button>

        {value && !disabled ? (
          <button
            aria-label="Clear date"
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#9aa6a1] transition hover:text-[var(--foreground)]"
            onClick={(event) => {
              event.stopPropagation();
              onChange("");
              setIsOpen(false);
            }}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-[#d70015]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--muted)]">{helperText}</p>
      ) : null}

      {isOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-50 rounded-xl border border-black/[0.06] bg-[#ffffff] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.14)]"
              ref={popoverRef}
              style={{ left: menuPosition.left, top: menuPosition.top, width: POPOVER_WIDTH }}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <button
                  aria-label="Previous month"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[#f0f4f1] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  disabled={prevMonthDisabled}
                  onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold tracking-[-0.01em]">
                  {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(viewMonth)}
                </span>
                <button
                  aria-label="Next month"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[#f0f4f1] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  disabled={nextMonthDisabled}
                  onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-1 px-1 text-center text-[11px] font-medium text-[var(--muted)]">
                {WEEKDAY_LABELS.map((weekday) => (
                  <span className="py-1" key={weekday}>
                    {weekday}
                  </span>
                ))}
                {cells.map((cell, index) => {
                  if (!cell) return <span key={`pad-${index}`} />;

                  const isOutOfRange =
                    (minDate && cell.isoValue < toIsoDate(minDate)) || (maxDate && cell.isoValue > toIsoDate(maxDate));
                  const isSelected = value === cell.isoValue;
                  const isToday = toIsoDate(today) === cell.isoValue;

                  return (
                    <button
                      className={cn(
                        "flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition",
                        isOutOfRange && "cursor-not-allowed text-[#c7cfca]",
                        !isOutOfRange && !isSelected && "text-[var(--foreground)] hover:bg-[#f0f4f1]",
                        isSelected && "bg-[var(--accent)] font-semibold text-white hover:bg-[var(--accent)]",
                        !isSelected && isToday && "border border-[var(--accent)]",
                      )}
                      disabled={Boolean(isOutOfRange)}
                      key={cell.isoValue}
                      onClick={() => {
                        onChange(cell.isoValue);
                        setIsOpen(false);
                      }}
                      type="button"
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
