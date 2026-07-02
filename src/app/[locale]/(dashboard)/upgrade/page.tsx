import { Suspense } from "react";
import UpgradePageClient from "./upgrade-client";

export default function UpgradePage() {
  return (
    <Suspense fallback={null}>
      <UpgradePageClient />
    </Suspense>
  );
}
