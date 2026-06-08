"use client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getLlmProviderGuide,
  LLM_PROVIDERS,
} from "@/lib/llm/provider-guides";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import type { LlmProvider } from "@/types/workspace";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  /** When known (e.g. wizard already loaded profile), skip fetch. */
  provider?: LlmProvider | null;
  className?: string;
};

export function LlmProviderConsoleLink({ provider: providerProp, className = "" }: Props) {
  const tLlm = useTranslations("setup.llm");
  const tErrors = useTranslations("errors");
  const { user } = useAuth();
  const [provider, setProvider] = useState<LlmProvider | null>(providerProp ?? null);

  useEffect(() => {
    if (providerProp != null) {
      setProvider(providerProp);
      return;
    }
    if (!user) return;
    void getUserLlmProfile(user.uid).then((profile) => {
      if (profile?.provider && LLM_PROVIDERS.includes(profile.provider)) {
        setProvider(profile.provider);
      }
    });
  }, [user, providerProp]);

  if (!provider) return null;

  const guide = getLlmProviderGuide(provider, tLlm);

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <a
        href={guide.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold underline"
      >
        {guide.linkLabel} →
      </a>
      <Link href="/setup/llm" className="text-sm font-semibold underline">
        {tErrors("openLlmSettings")} →
      </Link>
    </div>
  );
}
