import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Add Weather Location",
  robots: { follow: false, index: false },
};

export default function AddLocationLayout({ children }: { children: ReactNode }) {
  return children;
}
