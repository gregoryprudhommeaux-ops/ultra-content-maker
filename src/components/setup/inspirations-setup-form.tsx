"use client";

import { InspirationsEditor } from "@/components/setup/inspirations-editor";
import { useAuth } from "@/components/auth/auth-provider";

export function InspirationsSetupForm() {
  const { user } = useAuth();

  if (!user) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  return (
    <InspirationsEditor userId={user.uid} showMyPosts showPersonaHint />
  );
}
