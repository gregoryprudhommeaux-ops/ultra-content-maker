"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { getClientAuth } from "@/lib/firebase/client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PendingAction = "reset" | "delete" | null;

export function ProfileDataManagement() {
  const t = useTranslations("setup.llm.dataManagement");
  const { user } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  async function callWorkspaceApi(path: "/api/workspace/reset-profile" | "/api/workspace/delete-data") {
    if (!user) return false;
    const auth = getClientAuth();
    const token = auth ? await auth.currentUser?.getIdToken() : null;
    if (!token) {
      setError(t("errors.notAuthenticated"));
      return false;
    }

    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (data.error === "admin_not_configured") {
        setError(t("errors.adminNotConfigured"));
      } else {
        setError(t("errors.generic"));
      }
      return false;
    }

    return true;
  }

  async function onReset() {
    if (!window.confirm(t("reset.confirm"))) return;
    setError(null);
    setPending("reset");
    try {
      const ok = await callWorkspaceApi("/api/workspace/reset-profile");
      if (!ok) return;
      notifyOnboardingProgressChanged();
      router.push("/start");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function onDelete() {
    if (deleteConfirm.trim().toUpperCase() !== t("delete.confirmWord")) {
      setError(t("delete.confirmMismatch"));
      return;
    }
    setError(null);
    setPending("delete");
    try {
      const ok = await callWorkspaceApi("/api/workspace/delete-data");
      if (!ok) return;
      notifyOnboardingProgressChanged();
      setDeleteConfirm("");
      setShowDeleteForm(false);
      router.push("/start");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <details className="rounded-xl border border-red-200/80 bg-red-50/40">
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden md:px-5">
        <span className="text-sm font-semibold text-ns-tertiary">{t("title")}</span>
        <span className="mt-0.5 block text-xs font-medium text-ns-secondary">{t("subtitle")}</span>
      </summary>

      <div className="space-y-4 border-t border-red-200/60 px-4 pb-4 pt-3 md:px-5 md:pb-5">
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
          {t("warning")}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ns-tertiary">{t("reset.title")}</h3>
          <p className="text-xs leading-relaxed text-ns-secondary">{t("reset.description")}</p>
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void onReset()}
            className="rounded-lg border border-ns-alternate bg-white px-4 py-2 text-sm font-semibold text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
          >
            {pending === "reset" ? t("reset.pending") : t("reset.action")}
          </button>
        </div>

        <div className="space-y-2 border-t border-red-200/50 pt-4">
          <h3 className="text-sm font-semibold text-red-900">{t("delete.title")}</h3>
          <p className="text-xs leading-relaxed text-ns-secondary">{t("delete.description")}</p>
          {!showDeleteForm ? (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => {
                setError(null);
                setShowDeleteForm(true);
              }}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
            >
              {t("delete.showForm")}
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-ns-secondary">
                {t("delete.confirmLabel", { word: t("delete.confirmWord") })}
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={t("delete.confirmWord")}
                className="w-full max-w-xs rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-ns-tertiary"
                autoComplete="off"
                disabled={pending !== null}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void onDelete()}
                  className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-50"
                >
                  {pending === "delete" ? t("delete.pending") : t("delete.action")}
                </button>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => {
                    setShowDeleteForm(false);
                    setDeleteConfirm("");
                    setError(null);
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-ns-secondary hover:bg-white"
                >
                  {t("delete.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
