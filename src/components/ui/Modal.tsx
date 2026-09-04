"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type ModalProps = {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Modal({ children, className, isOpen, onClose, title }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-[2px]"
      role="dialog"
    >
      <div
        className={cn(
          "isolate w-full max-w-lg rounded-lg border border-[var(--line)] bg-[#ffffff] p-5 shadow-xl backdrop-blur-none",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
          <Button aria-label="Close modal" onClick={onClose} size="sm" variant="ghost">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
