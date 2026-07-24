import { wrapUcmPlainBody } from "@/lib/email/ucm-email-shell";
import {
  applyUcmTemplateVars,
  getUcmEmailTemplate,
} from "@/lib/email/ucm-templates";
import type {
  UcmEmailTemplateKey,
  UcmTemplateLocale,
  UcmTemplateVars,
} from "@/lib/email/ucm-template-types";
import { resolveUcmTemplateLocale } from "@/lib/email/ucm-template-types";

const RESEND_API = "https://api.resend.com/emails";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

export function ucmSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://127.0.0.1:3000";
}

export function buildUcmAppLinks(locale: UcmTemplateLocale): Pick<
  UcmTemplateVars,
  "dashboardUrl" | "createUrl" | "libraryUrl" | "upgradeUrl" | "loginUrl" | "settingsUrl"
> {
  const base = `${ucmSiteUrl()}/${locale}`;
  return {
    dashboardUrl: `${base}/dashboard`,
    createUrl: `${base}/articles/new`,
    libraryUrl: `${base}/articles`,
    upgradeUrl: `${base}/settings/billing`,
    loginUrl: `${base}/login`,
    settingsUrl: `${base}/settings`,
  };
}

export async function sendTemplatedCustomerEmail(input: {
  to: string;
  templateKey: UcmEmailTemplateKey;
  locale?: string | null;
  vars?: UcmTemplateVars;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const locale = resolveUcmTemplateLocale(input.locale);
  const template = await getUcmEmailTemplate(input.templateKey, locale);
  if (template.enabled === false) {
    return { ok: false, error: "template_disabled", skipped: true };
  }

  const links = buildUcmAppLinks(locale);
  const vars: UcmTemplateVars = { ...links, ...(input.vars ?? {}) };
  const subject = applyUcmTemplateVars(template.subject, vars);
  const body = applyUcmTemplateVars(template.body, vars);
  const html = wrapUcmPlainBody(body, { lang: locale });

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject,
      html,
      text: body,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: detail || `resend_${res.status}` };
  }

  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: json.id };
}
