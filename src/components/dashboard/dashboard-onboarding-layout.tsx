"use client";

import type { ReactNode } from "react";

/** @deprecated Provider + stepper live in `(dashboard)/layout.tsx`. Pass-through only. */
export function DashboardOnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
