"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { wrapUcmPlainBody } from "@/lib/email/ucm-email-shell";
import {
  DEFAULT_UCM_TEMPLATE_LOCALE,
  isCustomUcmEmailTemplateKey,
  SYSTEM_UCM_EMAIL_TEMPLATE_KEYS,
  UCM_EMAIL_TEMPLATE_LABELS,
  UCM_TEMPLATE_LOCALE_LABELS,
  UCM_TEMPLATE_LOCALES,
  ucmTemplateLabel,
  type UcmEmailTemplateDoc,
  type UcmEmailTemplateKey,
  type UcmTemplateLocale,
} from "@/lib/email/ucm-template-types";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS, LABEL_CLASS } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = { embedded?: boolean };

export function AdminEmailTemplatesPanel({ embedded = false }: Props) {
  const t = useTranslations("adminEmailTemplates");
  const { user } = useAuth();
  const [templates, setTemplates] = useState<UcmEmailTemplateDoc[]>([]);
  const [activeKey, setActiveKey] = useState<UcmEmailTemplateKey>("signup_welcome");
  const [editLocale, setEditLocale] = useState<UcmTemplateLocale>(DEFAULT_UCM_TEMPLATE_LOCALE);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const activeMeta = useMemo(
    () => templates.find((tpl) => tpl.key === activeKey),
    [templates, activeKey],
  );
  const isCustom = isCustomUcmEmailTemplateKey(activeKey);

  const previewHtml = useMemo(
    () => wrapUcmPlainBody(body || t("previewEmpty"), { lang: editLocale }),
    [body, editLocale, t],
  );

  const authHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const auth = getClientAuth();
    const token = auth ? await auth.currentUser?.getIdToken() : null;
    if (!token) return null;
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error("auth");
      const res = await fetch(`/api/admin/email-templates?locale=${editLocale}`, {
        headers,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        templates?: UcmEmailTemplateDoc[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "load_failed");
      const list = json.templates ?? [];
      setTemplates(list);
      const current =
        list.find((tpl) => tpl.key === activeKey) ??
        list.find((tpl) => tpl.key === "signup_welcome") ??
        list[0];
      if (current) {
        if (!list.some((tpl) => tpl.key === activeKey)) {
          setActiveKey(current.key);
        }
        setSubject(current.subject);
        setBody(current.body);
        setEnabled(current.enabled !== false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [user, authHeaders, activeKey, editLocale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTemplate() {
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error("auth");
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers,
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        template?: UcmEmailTemplateDoc;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.template) {
        throw new Error(json.error ?? "create_failed");
      }
      setNewLabel("");
      setActiveKey(json.template.key);
      setSubject(json.template.subject);
      setBody(json.template.body);
      setEnabled(true);
      setMessage(t("created", { label: json.template.label ?? json.template.key }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function save(opts: { reset?: boolean } = {}) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error("auth");
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          key: activeKey,
          locale: editLocale,
          subject: opts.reset ? "xxx" : subject,
          body: opts.reset ? "xxxxxxxxxx" : body,
          reset: opts.reset === true,
          enabled,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        template?: UcmEmailTemplateDoc;
        error?: string;
        translateWarning?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "save_failed");
      if (json.template) {
        setSubject(json.template.subject);
        setBody(json.template.body);
        setEnabled(json.template.enabled !== false);
      }
      setMessage(
        opts.reset
          ? t("resetOk")
          : json.translateWarning
            ? t("savedPartial", { detail: json.translateWarning })
            : t("saved"),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error("auth");
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers,
        body: JSON.stringify({ key: activeKey, enabled: next }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "toggle_failed");
      setMessage(next ? t("enabled") : t("disabled"));
    } catch (e) {
      setEnabled(!next);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustom() {
    if (!isCustom) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    setSaving(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error("auth");
      const res = await fetch(`/api/admin/email-templates?key=${encodeURIComponent(activeKey)}`, {
        method: "DELETE",
        headers,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "delete_failed");
      setActiveKey("signup_welcome");
      setMessage(t("deleted"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const inner = (
    <div className="space-y-4">
      <p className="text-sm text-ns-secondary">{t("hint")}</p>

      <div className="flex flex-wrap gap-2">
        {SYSTEM_UCM_EMAIL_TEMPLATE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveKey(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              activeKey === key
                ? "border-ns-primary bg-ns-brand-light text-ns-tertiary"
                : "border-gray-200 text-ns-secondary hover:border-ns-primary/40"
            }`}
          >
            {UCM_EMAIL_TEMPLATE_LABELS[key]}
          </button>
        ))}
        {templates
          .filter((tpl) => isCustomUcmEmailTemplateKey(tpl.key))
          .map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setActiveKey(tpl.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                activeKey === tpl.key
                  ? "border-ns-primary bg-ns-brand-light text-ns-tertiary"
                  : "border-dashed border-gray-300 text-ns-secondary"
              }`}
            >
              {tpl.label ?? ucmTemplateLabel(tpl.key)}
            </button>
          ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className={LABEL_CLASS}>{t("newLabel")}</label>
          <input
            className={`${INPUT_CLASS} mt-1`}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t("newPlaceholder")}
          />
        </div>
        <button
          type="button"
          disabled={creating || newLabel.trim().length < 2}
          onClick={() => void createTemplate()}
          className={`${BTN_SECONDARY} disabled:opacity-50`}
        >
          {creating ? t("creating") : t("create")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {UCM_TEMPLATE_LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setEditLocale(loc)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              editLocale === loc
                ? "border-ns-primary bg-ns-brand-light"
                : "border-gray-200 text-ns-secondary"
            }`}
          >
            {UCM_TEMPLATE_LOCALE_LABELS[loc]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ns-secondary">…</p>
      ) : (
        <>
          <p className="text-xs text-ns-secondary">
            <span className="font-medium text-ns-tertiary">{ucmTemplateLabel(activeKey)}</span>
            {activeMeta?.updatedAt
              ? ` · ${t("updatedAt", { date: new Date(activeMeta.updatedAt).toLocaleString() })}`
              : ""}
          </p>

          <div>
            <label className={LABEL_CLASS} htmlFor="ucm-email-subject">
              {t("subject")}
            </label>
            <input
              id="ucm-email-subject"
              className={`${INPUT_CLASS} mt-1`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="ucm-email-body">
              {t("body")}
            </label>
            <textarea
              id="ucm-email-body"
              rows={14}
              className={`${INPUT_CLASS} mt-1 min-h-[16rem] resize-y font-mono text-sm`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-ns-secondary">{t("varsHint")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className={`${BTN_PRIMARY} disabled:opacity-50`}
            >
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggleEnabled()}
              className={`${BTN_SECONDARY} disabled:opacity-50`}
            >
              {enabled ? t("disable") : t("enable")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save({ reset: true })}
              className={`${BTN_SECONDARY} disabled:opacity-50`}
            >
              {isCustom ? t("delete") : t("reset")}
            </button>
            {isCustom ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteCustom()}
                className="text-xs font-medium text-red-700 underline disabled:opacity-50"
              >
                {t("deleteHard")}
              </button>
            ) : null}
            <button
              type="button"
              className="text-xs font-medium text-ns-secondary underline"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? t("hidePreview") : t("showPreview")}
            </button>
          </div>

          {showPreview ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <p className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-ns-secondary">
                {t("preview")}
              </p>
              <iframe
                title={t("preview")}
                className="h-[28rem] w-full bg-white"
                srcDoc={previewHtml}
              />
            </div>
          ) : null}
        </>
      )}

      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );

  if (embedded) return inner;
  return (
    <AdminPanelShell tone="slate">
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <div className="mt-4">{inner}</div>
    </AdminPanelShell>
  );
}
