import { LandingPage } from "@/components/landing/landing-page";
import { Suspense } from "react";

export default function LocaleHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ns-hero">
          <p className="text-sm text-white/70">…</p>
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
