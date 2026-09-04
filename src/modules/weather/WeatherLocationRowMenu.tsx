"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";
import type { WeatherLocation } from "@/lib/weather";

type WeatherLocationRowMenuProps = {
  location: WeatherLocation;
  onDelete: () => void;
  onEdit: () => void;
};

export function WeatherLocationRowMenu({ location, onDelete, onEdit }: WeatherLocationRowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  function updateMenuPosition() {
    const trigger = triggerRef.current;

    if (!trigger || typeof window === "undefined") return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = menuRef.current?.offsetHeight ?? 104;
    const gap = 8;
    const margin = 12;
    const maxLeft = window.innerWidth - menuWidth - margin;
    let left = triggerRect.right - menuWidth;
    let top = triggerRect.bottom + gap;

    left = Math.max(margin, Math.min(left, maxLeft));

    if (top + menuHeight + margin > window.innerHeight) {
      top = Math.max(margin, triggerRect.top - menuHeight - gap);
    }

    setMenuPosition({ left, top });
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedMenu = menuRef.current?.contains(target);
      const clickedTrigger = triggerRef.current?.contains(target);

      if (!clickedMenu && !clickedTrigger) setIsOpen(false);
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
  }, [isOpen]);

  return (
    <div className="relative inline-flex" onClick={(event) => event.stopPropagation()} ref={triggerRef}>
      <button
        aria-expanded={isOpen}
        aria-label={`More actions for ${location.name}`}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--muted)] transition hover:bg-[#f0f4f1] hover:text-[var(--foreground)]",
          isOpen && "bg-[#f0f4f1] text-[var(--foreground)]",
        )}
        onClick={() => {
          updateMenuPosition();
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[100] w-40 rounded-xl border border-black/[0.06] bg-white p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.14)]"
              onClick={(event) => event.stopPropagation()}
              ref={menuRef}
              style={{ left: menuPosition.left, top: menuPosition.top }}
            >
              <button
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[#f5f5f5]"
                onClick={() => {
                  setIsOpen(false);
                  onEdit();
                }}
                type="button"
              >
                <Pencil className="h-4 w-4 text-[#74747d]" />
                Edit
              </button>
              <button
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[#b42318] transition hover:bg-[#fff3f2]"
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
