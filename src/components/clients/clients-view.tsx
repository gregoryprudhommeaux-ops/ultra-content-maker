"use client";

import { CreateClientForm } from "@/components/clients/create-client-form";
import { useAuth } from "@/components/auth/auth-provider";
import { listClients } from "@/lib/clients/firestore";
import { Link } from "@/i18n/navigation";
import type { Client } from "@/types/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function ClientsView() {
  const t = useTranslations("dashboard.clients");
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listClients(user.uid);
      setClients(data);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  if (clients.length === 0 && !showCreate) {
    return (
      <div className="rounded-xl border border-dashed border-ns-alternate bg-white px-8 py-16 text-center">
        <h2 className="text-xl font-semibold text-ns-tertiary">{t("empty.title")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ns-secondary">{t("empty.description")}</p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="mt-6 rounded-sm bg-ns-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
        >
          {t("empty.cta")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-sm bg-ns-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90"
          >
            {t("empty.cta")}
          </button>
        )}
      </div>

      {showCreate && user && (
        <CreateClientForm
          userId={user.uid}
        />
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {clients.map((client) => (
          <li key={client.id}>
            <Link
              href={`/clients/${client.id}`}
              className="block rounded-2xl border border-gray-100 bg-ns-surface p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold text-ns-tertiary">{client.name}</h3>
              <p className="mt-1 text-sm text-ns-secondary">{client.clientTypeLabel}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-ns-secondary">
                <div>
                  <dt className="font-medium">{t("card.onboarding")}</dt>
                  <dd>{client.onboardingStatus}</dd>
                </div>
                <div>
                  <dt className="font-medium">{t("card.brain")}</dt>
                  <dd>{client.brainStatus}</dd>
                </div>
                <div>
                  <dt className="font-medium">{t("card.generations")}</dt>
                  <dd>—</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
