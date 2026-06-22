"use client";

import { CopyAccountInviteLink } from "@/components/workspace/copy-account-invite-link";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { META_LABEL, INPUT_CLASS } from "@/lib/ui/nextstep";
import type { ContentLanguage } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const LANGUAGES: ContentLanguage[] = ["fr", "en", "es"];

export function AccountSwitcher() {
  const t = useTranslations("workspaceAccounts");
  const isPlatformAdmin = usePlatformAdmin();
  const {
    accounts,
    activeAccount,
    loading,
    canManageAccounts,
    switchAccount,
    createAccount,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<ContentLanguage>("fr");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!isPlatformAdmin && !loading && !canManageAccounts && accounts.length <= 1) {
    return null;
  }

  if (isPlatformAdmin && loading && accounts.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className={`${META_LABEL} text-white/50`}>{t("loading")}</p>
      </div>
    );
  }

  async function handleSwitch(accountId: string) {
    if (accountId === activeAccount?.id) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await switchAccount(accountId);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createAccount(name, newLang);
      setNewName("");
      setCreating(false);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="relative border-b border-white/10 px-3 py-3">
      <p className={`${META_LABEL} mb-2 text-white/45`}>{t("label")}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:border-ns-primary/40 hover:bg-white/10 disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 truncate">
          {activeAccount?.name ?? t("unnamed")}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <CopyAccountInviteLink />

      {open && (
        <div
          className="absolute left-3 right-3 top-full z-50 mt-1 max-h-[min(70vh,320px)] overflow-y-auto rounded-lg border border-white/15 bg-ns-hero py-1 shadow-xl"
          role="listbox"
          aria-label={t("label")}
        >
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              role="option"
              aria-selected={account.id === activeAccount?.id}
              disabled={busy}
              onClick={() => void handleSwitch(account.id)}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 disabled:opacity-60 ${
                account.id === activeAccount?.id
                  ? "bg-ns-primary/15 text-ns-primary"
                  : "text-white/90"
              }`}
            >
              <span className="font-medium">{account.name}</span>
              <span className={`${META_LABEL} text-white/45`}>
                {t(`language.${account.contentLanguage}`)}
              </span>
            </button>
          ))}

          {canManageAccounts && !creating && (
            <button
              type="button"
              className="mt-1 w-full border-t border-white/10 px-3 py-2.5 text-left text-sm font-semibold text-ns-primary hover:bg-white/5"
              onClick={() => setCreating(true)}
            >
              {t("createAccount")}
            </button>
          )}

          {canManageAccounts && creating && (
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="space-y-2 border-t border-white/10 px-3 py-3"
            >
              <label className={`${META_LABEL} block text-white/50`} htmlFor="new-account-name">
                {t("newAccountName")}
              </label>
              <input
                id="new-account-name"
                className={`${INPUT_CLASS} !border-white/20 !bg-white/5 !text-white placeholder:!text-white/40`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("newAccountNamePlaceholder")}
                autoFocus
              />
              <label className={`${META_LABEL} block text-white/50`} htmlFor="new-account-lang">
                {t("newAccountLanguage")}
              </label>
              <select
                id="new-account-lang"
                className={`${INPUT_CLASS} !border-white/20 !bg-white/5 !text-white`}
                value={newLang}
                onChange={(e) => setNewLang(e.target.value as ContentLanguage)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {t(`language.${lang}`)}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy || !newName.trim()}
                  className="flex-1 rounded-md bg-ns-primary px-3 py-2 text-xs font-bold text-ns-hero hover:opacity-90 disabled:opacity-50"
                >
                  {t("createSubmit")}
                </button>
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-xs font-semibold text-white/60 hover:text-white"
                  onClick={() => setCreating(false)}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
