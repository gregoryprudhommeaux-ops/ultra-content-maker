"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClient } from "@/lib/clients/firestore";
import { Link } from "@/i18n/navigation";
import type { Client } from "@/types/client";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";

type Props = { params: Promise<{ id: string }> };

export default function ClientHubPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations("client.hub");
  const tCommon = useTranslations("common");
  const tCard = useTranslations("dashboard.clients.card");
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!user) return;
    getClient(user.uid, id).then(setClient);
  }, [user, id]);

  const links = [
    {
      key: "onboarding" as const,
      href: `/clients/${id}/onboarding`,
      ready: true,
      status: client?.onboardingStatus,
    },
    {
      key: "brain" as const,
      href: `/clients/${id}/brain`,
      ready: client?.onboardingStatus === "completed",
      status: client?.brainStatus,
    },
    {
      key: "generate" as const,
      href: `/clients/${id}/generate`,
      ready: client?.onboardingStatus === "completed",
      status: null,
    },
    {
      key: "history" as const,
      href: `/clients/${id}/history`,
      ready: client?.onboardingStatus === "completed",
      status: null,
    },
  ];

  return (
    <div className="space-y-6">
      <Link href="/clients" className="text-sm text-ns-secondary hover:text-ns-tertiary">
        {t("backToList")}
      </Link>
      <h1 className="text-2xl font-semibold text-ns-tertiary">
        {client?.name ?? "…"}
      </h1>
      {client && (
        <dl className="flex flex-wrap gap-4 text-sm text-ns-secondary">
          <div>
            <dt className="font-medium text-ns-secondary">{tCard("onboarding")}</dt>
            <dd>{client.onboardingStatus}</dd>
          </div>
          <div>
            <dt className="font-medium text-ns-secondary">{tCard("brain")}</dt>
            <dd>{client.brainStatus}</dd>
          </div>
        </dl>
      )}
      <nav className="flex flex-wrap gap-3">
        {links.map(({ key, href, ready, status }) => (
          <Link
            key={key}
            href={ready ? href : "#"}
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              ready
                ? "border-gray-100 bg-white text-ns-tertiary hover:border-ns-primary"
                : "cursor-not-allowed border-zinc-100 bg-ns-brand-light text-ns-secondary/60"
            }`}
            onClick={(e) => {
              if (!ready) e.preventDefault();
            }}
          >
            {t(key)}
            {status && (
              <span className="ml-2 text-xs text-ns-secondary/60">({status})</span>
            )}
            {!ready && (
              <span className="ml-2 text-xs text-ns-secondary/60">
                ({tCommon("comingSoon")})
              </span>
            )}
          </Link>
        ))}
      </nav>
      {client?.onboardingStatus !== "completed" && (
        <p className="text-sm text-ns-secondary">
          <Link
            href={`/clients/${id}/onboarding`}
            className="font-medium text-ns-tertiary underline"
          >
            {t("continueOnboarding")}
          </Link>
        </p>
      )}
    </div>
  );
}
