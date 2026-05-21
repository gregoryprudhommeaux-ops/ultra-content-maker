"use client";

import { PersonaSectionPlaceholder } from "@/components/clients/persona-section-placeholder";
import { use } from "react";

type Props = { params: Promise<{ id: string }> };

export default function PersonaBrainPage({ params }: Props) {
  const { id } = use(params);
  return <PersonaSectionPlaceholder personaId={id} section="brain" />;
}
