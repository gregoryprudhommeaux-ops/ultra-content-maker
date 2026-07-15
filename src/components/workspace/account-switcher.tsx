"use client";

import { CopyAccountInviteLink } from "@/components/workspace/copy-account-invite-link";
import { DeleteClientAccountButton } from "@/components/workspace/delete-client-account-button";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { META_LABEL, INPUT_CLASS } from "@/lib/ui/nextstep";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import type { ContentLanguage } from "@/types/workspace";
import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { OPEN_ACCOUNT_SWITCHER_EVENT } from "@/lib/workspace/account-switcher-events";

const LANGUAGES: ContentLanguage[] = ["fr", "en", "es"];

type AccountPanelMode = "list" | "create";

export function AccountSwitcher() {
  const t = useTranslations("workspaceAccounts");
  const locale = useLocale();
  const { user } = useAuth();
  const isPlatformAdmin = usePlatformAdmin();
  const {
    accounts,
    activeAccount,
    loading,
    canManageAccounts,
    switchAccount,
    createAccount,
  } = useWorkspace();
  const pathname = usePathname();
  const isAdminRoute = Boolean(pathname?.includes("/admin"));
  const [open, setOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<AccountPanelMode>("list");
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<ContentLanguage>("fr");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /** Hard reload so no residual React/library state from the previous account remains. */
  const navigateToAccountHome = useCallback(async () => {
    if (!user) return;
    const path = await resolveLandingPath(user.uid);
    const href = `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
    window.location.assign(href);
  }, [locale, user]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    const onOpenRequest = () => {
      setPanelMode("list");
      setOpen(true);
    };
    window.addEventListener(OPEN_ACCOUNT_SWITCHER_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_ACCOUNT_SWITCHER_EVENT, onOpenRequest);
  }, [isPlatformAdmin]);

  const hasManagedClients = accounts.some((account) => account.isManaged);
  const isManagingClient = Boolean(activeAccount?.isManaged);
  const isAgencyPanel = isPlatformAdmin && hasManagedClients;
  const sectionLabel = isPlatformAdmin && hasManagedClients ? t("agencyMode") : t("label");

  function closeDropdown() {
    setOpen(false);
    setPanelMode("list");
  }

  function openDropdown() {
    setOpen(true);
  }

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
      if (isPlatformAdmin) {
        setBusy(true);
        try {
          await navigateToAccountHome();
          closeDropdown();
        } finally {
          setBusy(false);
        }
      } else {
        closeDropdown();
      }
      return;
    }
    setBusy(true);
    try {
      await switchAccount(accountId);
      closeDropdown();
      if (isPlatformAdmin) {
        await navigateToAccountHome();
      }
    } catch {
      /* switch failed — keep dropdown open so the user can retry */
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
      closeDropdown();
      if (isPlatformAdmin) {
        await navigateToAccountHome();
      }
    } finally {
      setBusy(false);
    }
  }

  function openActiveAccount() {
    void navigateToAccountHome();
    closeDropdown();
  }

  return (
    <div
      ref={rootRef}
      className={`relative border-b border-white/10 px-3 py-3 ${open ? "z-50" : ""}`}
    >
      <p className={`${META_LABEL} mb-2 text-white/45`}>{sectionLabel}</p>

      {isAdminRoute ? (
        <div className="flex w-full items-stretch overflow-hidden rounded-lg border border-white/15 bg-white/5">
          <button
            type="button"
            disabled={busy || !activeAccount}
            onClick={() => openActiveAccount()}
            title={t("returnToAccount")}
            className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10 hover:text-ns-primary disabled:opacity-60"
          >
            {activeAccount?.name ?? t("unnamed")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (open) closeDropdown();
              else {
                setPanelMode("list");
                openDropdown();
              }
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={t("openAccountList")}
            className="flex shrink-0 items-center border-l border-white/15 px-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
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
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (open) closeDropdown();
            else {
              setPanelMode("list");
              openDropdown();
            }
          }}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
            isManagingClient
              ? "border-amber-400/50 bg-amber-950/35 shadow-[inset_3px_0_0_0_#fbbf24] hover:border-amber-400/70 hover:bg-amber-950/45"
              : isPlatformAdmin && hasManagedClients
                ? "border-ns-primary/35 bg-ns-primary/10 shadow-[inset_3px_0_0_0_#9dc41a] hover:border-ns-primary/50 hover:bg-ns-primary/15"
                : "border-white/15 bg-white/5 hover:border-ns-primary/40 hover:bg-white/10"
          }`}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1">
            {isPlatformAdmin && hasManagedClients && activeAccount ? (
              <span
                className={`${META_LABEL} block truncate ${
                  isManagingClient ? "text-amber-200" : "text-ns-primary"
                }`}
              >
                {isManagingClient ? t("agencyManagedContext") : t("agencyYourAdminAccount")}
              </span>
            ) : null}
            <span className="block truncate text-sm font-semibold text-white">
              {activeAccount?.name ?? t("unnamed")}
            </span>
            {isManagingClient && activeAccount?.managedClientEmail ? (
              <span className="mt-0.5 block truncate text-xs font-medium text-amber-100/75">
                {activeAccount.managedClientEmail}
              </span>
            ) : isPlatformAdmin && hasManagedClients && activeAccount ? (
              <span className={`${META_LABEL} mt-0.5 block text-white/50`}>
                {t(`language.${activeAccount.contentLanguage}`)}
              </span>
            ) : null}
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
      )}

      {!activeAccount?.isManaged ? <CopyAccountInviteLink /> : null}
      {!activeAccount?.isManaged ? <DeleteClientAccountButton /> : null}

      {open && (
        <div
          className={`absolute left-3 right-3 top-full z-[110] mt-1 max-h-[min(85vh,28rem)] overflow-y-auto rounded-lg py-1 shadow-xl ${
            isAgencyPanel
              ? "border border-ns-primary/50 bg-[#243018] shadow-[0_14px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(157,196,26,0.12)] ring-1 ring-ns-primary/25"
              : "border border-white/15 bg-ns-hero"
          }`}
          role="listbox"
          aria-label={t("label")}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {panelMode === "create" && canManageAccounts ? (
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="space-y-2 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{t("createAccount")}</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-white/55 hover:text-white"
                  onClick={() => setPanelMode("list")}
                >
                  {t("cancel")}
                </button>
              </div>
              <label className={`${META_LABEL} block text-white/50`} htmlFor="new-account-name">
                {t("newAccountName")}
              </label>
              <ImeSafeInput
                id="new-account-name"
                className={`${INPUT_CLASS} !border-white/20 !bg-white/5 !text-white placeholder:!text-white/40`}
                value={newName}
                onValueChange={setNewName}
                placeholder={t("newAccountNamePlaceholder")}
                autoFocus
                lang={locale}
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
              </div>
            </form>
          ) : (
            <>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  role="option"
                  aria-selected={account.id === activeAccount?.id}
                  disabled={busy}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleSwitch(account.id)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60 ${
                    account.id === activeAccount?.id
                      ? isAgencyPanel
                        ? "bg-ns-primary/25 text-ns-primary"
                        : "bg-ns-primary/15 text-ns-primary"
                      : isAgencyPanel
                        ? "text-white/95 hover:bg-ns-primary/12"
                        : "text-white/90 hover:bg-white/5"
                  }`}
                >
                  <span className="font-medium">{account.name}</span>
                  <span
                    className={`${META_LABEL} ${
                      isAgencyPanel ? "text-ns-primary/65" : "text-white/45"
                    }`}
                  >
                    {account.isManaged
                      ? t("managedClientBadge", { email: account.managedClientEmail ?? "" })
                      : t(`language.${account.contentLanguage}`)}
                  </span>
                </button>
              ))}

              {canManageAccounts ? (
                <button
                  type="button"
                  className={`mt-1 w-full px-3 py-2.5 text-left text-sm font-semibold text-ns-primary ${
                    isAgencyPanel
                      ? "border-t border-ns-primary/30 hover:bg-ns-primary/12"
                      : "border-t border-white/10 hover:bg-white/5"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPanelMode("create");
                  }}
                >
                  {t("createAccount")}
                </button>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
