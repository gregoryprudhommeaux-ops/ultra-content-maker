"use client";

import { AdminSupportDealAcceptDialog } from "@/components/admin/admin-support-deal-accept-dialog";
import { AdminSupportDealTermsEditor } from "@/components/admin/admin-support-deal-terms-editor";
import { AdminSupportQuoteTemplateDialog } from "@/components/admin/admin-support-quote-template-dialog";
import { AdminSupportQuoteProposalEditor } from "@/components/admin/admin-support-quote-proposal-editor";
import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import type {
  QuoteContentLocale,
  SupportQuoteForProposal,
  SupportQuoteProposalDraft,
} from "@/lib/admin/support-quote-proposal-shared";
import type { SupportCommercialTerms } from "@/types/subscription";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  embedded?: boolean;
};

type StatusFilter = "open" | "won" | "all";

const STATUS_OPTIONS = ["new", "contacted", "quoted", "won", "lost", "archived"] as const;

export function AdminCommercialProposalsPanel({ embedded = false }: Props) {
  const t = useTranslations("adminCommercialProposals");
  const tQuotes = useTranslations("adminSupportQuotes");
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<SupportQuoteForProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/support-quotes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as { quotes: SupportQuoteForProposal[] };
      setQuotes(body.quotes ?? []);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "won") {
      return quotes.filter((q) => q.status === "won");
    }
    if (filter === "open") {
      return quotes.filter(
        (q) => q.status !== "won" && q.status !== "lost" && q.status !== "archived",
      );
    }
    return quotes;
  }, [quotes, filter]);

  const selected = useMemo(
    () => quotes.find((q) => q.id === selectedId) ?? null,
    [quotes, selectedId],
  );

  useEffect(() => {
    if (selectedId && filtered.some((q) => q.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  useEffect(() => {
    setAdminNote(selected?.adminNote ?? "");
  }, [selected]);

  async function patchQuote(
    quoteId: string,
    patch: Record<string, unknown>,
  ) {
    if (!user) return;
    setPendingId(quoteId);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/support-quotes", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId, ...patch }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setError(body.detail ?? body.error ?? t("saveFailed"));
        return;
      }
      const action = patch.action as string | undefined;
      if (action === "send_proposal") setMessage(t("sentOk"));
      else if (action === "save_proposal") setMessage(t("savedOk"));
      else if (action === "regenerate_proposal") setMessage(t("regeneratedOk"));
      else if (action === "save_commercial_terms") setMessage(t("terms.savedOk"));
      else if (action === "accept_proposal") {
        setMessage(t("accept.success"));
        setAcceptOpen(false);
      } else if (patch.adminNote !== undefined) setMessage(t("noteSaved"));
      else if (patch.status) setMessage(t("statusSaved"));
      await load();
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPendingId(null);
    }
  }

  function planLabel(plan: SupportQuoteForProposal["plan"]): string {
    if (plan === "starter") return tQuotes("plan.starter");
    if (plan === "regular") return tQuotes("plan.regular");
    if (plan === "much_more") return tQuotes("plan.much_more");
    return tQuotes("plan.unspecified");
  }

  return (
    <AdminPanelShell embedded={embedded} tone="neutral">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
          <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          className={`${BTN_SECONDARY} !px-3 !py-1.5 text-xs font-semibold`}
          onClick={() => setTemplateOpen(true)}
        >
          {t("templates.button")}
        </button>
      </div>

      <AdminSupportQuoteTemplateDialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSaved={() => setMessage(t("templates.savedHint"))}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {(["open", "won", "all"] as StatusFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              filter === key
                ? "bg-ns-tertiary text-white"
                : "border border-ns-border bg-white text-ns-secondary"
            }`}
          >
            {t(`filters.${key}`)}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-4 text-sm text-ns-secondary">{t("loading")}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-ns-border bg-white px-4 py-6 text-sm text-ns-secondary">
          {t("empty")}
        </p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
          <aside className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ns-primary">
              {t("requestList")}
            </p>
            {filtered.map((row) => {
              const active = row.id === selectedId;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-ns-primary bg-ns-primary/10 shadow-sm"
                      : "border-ns-border bg-white hover:border-ns-primary/40"
                  }`}
                >
                  <p className="font-semibold text-ns-hero">{row.companyName || row.fullName}</p>
                  <p className="mt-1 text-xs text-ns-secondary">
                    {planLabel(row.plan)} · {tQuotes(`status.${row.status}`)}
                  </p>
                  {row.proposalSentAt ? (
                    <p className="mt-1 text-[11px] font-medium text-emerald-700">{t("alreadySent")}</p>
                  ) : null}
                </button>
              );
            })}
          </aside>

          <div className="min-w-0 space-y-4">
            {selected ? (
              <>
                <div className="rounded-xl border border-ns-border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ns-tertiary">
                        {selected.companyName}{" "}
                        <span className="font-normal text-ns-secondary">· {selected.fullName}</span>
                      </p>
                      <p className="mt-1 text-sm text-ns-secondary">
                        {planLabel(selected.plan)} · {selected.email}
                      </p>
                    </div>
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-medium text-ns-secondary">
                        {tQuotes("statusLabel")}
                      </span>
                      <select
                        className={INPUT_CLASS}
                        value={selected.status}
                        disabled={pendingId === selected.id}
                        onChange={(e) =>
                          void patchQuote(selected.id, { status: e.target.value })
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {tQuotes(`status.${status}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {selected.activityNeed ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ns-secondary">
                      {selected.activityNeed}
                    </p>
                  ) : null}
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block font-medium text-ns-tertiary">
                      {tQuotes("adminNote")}
                    </span>
                    <textarea
                      className={`${INPUT_CLASS} text-sm`}
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={`${BTN_SECONDARY} mt-2 !px-3 !py-1.5 text-xs`}
                    disabled={pendingId === selected.id}
                    onClick={() => void patchQuote(selected.id, { adminNote })}
                  >
                    {tQuotes("saveNote")}
                  </button>
                </div>

                {selected.status !== "won" ? (
                  <>
                    <AdminSupportDealTermsEditor
                      quote={selected}
                      pending={pendingId === selected.id}
                      onSave={(commercialTerms: SupportCommercialTerms) =>
                        void patchQuote(selected.id, {
                          action: "save_commercial_terms",
                          commercialTerms,
                        })
                      }
                      onRegenerate={() =>
                        void patchQuote(selected.id, { action: "regenerate_proposal" })
                      }
                    />

                    <AdminSupportQuoteProposalEditor
                      quote={selected}
                      pending={pendingId === selected.id}
                      onPatch={(action, payload) =>
                        void patchQuote(selected.id, { action, ...payload })
                      }
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className={BTN_PRIMARY}
                        disabled={pendingId === selected.id}
                        onClick={() => setAcceptOpen(true)}
                      >
                        {t("accept.button")}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {t("accept.alreadyAccepted")}
                    {selected.userId ? ` · UID: ${selected.userId}` : ""}
                  </p>
                )}

                <AdminSupportDealAcceptDialog
                  quote={selected}
                  open={acceptOpen}
                  pending={pendingId === selected.id}
                  onClose={() => setAcceptOpen(false)}
                  onAccept={(userId) =>
                    void patchQuote(selected.id, { action: "accept_proposal", userId })
                  }
                />
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-ns-border bg-white px-4 py-10 text-center text-sm text-ns-secondary">
                {t("selectRequest")}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
