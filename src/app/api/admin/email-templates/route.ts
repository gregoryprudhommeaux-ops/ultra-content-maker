import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import {
  defaultEmailTemplate,
  defaultLocaleContent,
} from "@/lib/email/ucm-template-defaults";
import {
  getUcmEmailTemplate,
  isValidUcmTemplateKey,
  listUcmEmailTemplates,
} from "@/lib/email/ucm-templates";
import {
  isCustomUcmEmailTemplateKey,
  resolveUcmTemplateLocale,
  slugToCustomUcmTemplateKey,
  UCM_EMAIL_TEMPLATES_COLLECTION,
  UCM_TEMPLATE_LOCALES,
  type UcmEmailTemplateKey,
  type UcmEmailTemplateLocaleContent,
  type UcmTemplateLocale,
} from "@/lib/email/ucm-template-types";
import { translateUcmTemplateLocales } from "@/lib/email/translate-ucm-template";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

async function buildSyncedLocales(input: {
  sourceLocale: UcmTemplateLocale;
  subject: string;
  body: string;
}): Promise<
  | { ok: true; locales: Record<UcmTemplateLocale, UcmEmailTemplateLocaleContent> }
  | { ok: false; error: string }
> {
  try {
    const locales = await translateUcmTemplateLocales(input);
    return { ok: true, locales };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `translate_failed:${msg}` };
  }
}

export async function GET(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (isNextResponse(admin)) return admin;

  const url = new URL(request.url);
  const locale = resolveUcmTemplateLocale(url.searchParams.get("locale"));
  const templates = await listUcmEmailTemplates(locale);
  return NextResponse.json({ ok: true, templates, locale });
}

export async function POST(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (isNextResponse(admin)) return admin;

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: { label?: string; slug?: string };
  try {
    body = (await request.json()) as { label?: string; slug?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const label = String(body.label ?? "").trim();
  if (label.length < 2) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const key = slugToCustomUcmTemplateKey(body.slug ?? label);
  if (!key) {
    return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const ref = db.collection(UCM_EMAIL_TEMPLATES_COLLECTION).doc(key);
  if ((await ref.get()).exists) {
    return NextResponse.json({ ok: false, error: "already_exists", key }, { status: 409 });
  }

  const starter = defaultEmailTemplate(key, "fr", { label });
  const now = new Date().toISOString();
  await ref.set({
    key,
    custom: true,
    label,
    locales: starter.locales,
    enabled: true,
    updatedAt: now,
  });

  const template = await getUcmEmailTemplate(key, "fr");
  return NextResponse.json({ ok: true, template }, { status: 201 });
}

export async function PUT(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (isNextResponse(admin)) return admin;

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: {
    key?: string;
    locale?: string;
    subject?: string;
    body?: string;
    reset?: boolean;
    enabled?: boolean;
    label?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const key = String(body.key ?? "");
  if (!isValidUcmTemplateKey(key)) {
    return NextResponse.json({ ok: false, error: "invalid_template_key" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const ref = db.collection(UCM_EMAIL_TEMPLATES_COLLECTION).doc(key);
  const now = new Date().toISOString();

  if (body.reset) {
    if (isCustomUcmEmailTemplateKey(key)) {
      await ref.delete().catch(() => undefined);
      return NextResponse.json({ ok: true, reset: true, deleted: true });
    }
    const defaults = defaultEmailTemplate(key, "fr");
    await ref.set({
      key,
      locales: defaults.locales,
      enabled: true,
      updatedAt: now,
    });
    const template = await getUcmEmailTemplate(key, body.locale);
    return NextResponse.json({ ok: true, template, reset: true });
  }

  if (typeof body.enabled === "boolean" && body.subject === undefined && body.body === undefined) {
    const existing = await ref.get();
    const prev = existing.exists ? (existing.data() as Record<string, unknown>) : {};
    await ref.set(
      {
        ...prev,
        key,
        enabled: body.enabled,
        updatedAt: now,
        ...(typeof body.label === "string" && body.label.trim()
          ? { label: body.label.trim(), custom: true }
          : {}),
      },
      { merge: true },
    );
    const template = await getUcmEmailTemplate(key, body.locale);
    return NextResponse.json({ ok: true, template });
  }

  const locale = resolveUcmTemplateLocale(body.locale);
  const subject = String(body.subject ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (subject.length < 3 || text.length < 10) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const synced = await buildSyncedLocales({
    sourceLocale: locale,
    subject,
    body: text,
  });
  if (!synced.ok) {
    // Fallback: keep source locale only, copy source to others
    const locales = Object.fromEntries(
      UCM_TEMPLATE_LOCALES.map((loc) => [
        loc,
        loc === locale
          ? { subject, body: text }
          : defaultLocaleContent(key as UcmEmailTemplateKey, loc),
      ]),
    ) as Record<UcmTemplateLocale, UcmEmailTemplateLocaleContent>;
    await ref.set(
      {
        key,
        locales,
        enabled: true,
        updatedAt: now,
        ...(isCustomUcmEmailTemplateKey(key)
          ? {
              custom: true,
              label:
                typeof body.label === "string" && body.label.trim()
                  ? body.label.trim()
                  : undefined,
            }
          : {}),
      },
      { merge: true },
    );
    const template = await getUcmEmailTemplate(key, locale);
    return NextResponse.json({
      ok: true,
      template,
      translateWarning: synced.error,
    });
  }

  await ref.set(
    {
      key,
      locales: synced.locales,
      enabled: true,
      updatedAt: now,
      ...(isCustomUcmEmailTemplateKey(key)
        ? {
            custom: true,
            label:
              typeof body.label === "string" && body.label.trim()
                ? body.label.trim()
                : undefined,
          }
        : {}),
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
    },
    { merge: true },
  );

  const template = await getUcmEmailTemplate(key, locale);
  return NextResponse.json({ ok: true, template });
}

export async function DELETE(request: Request) {
  const admin = await requirePlatformAdmin(request);
  if (isNextResponse(admin)) return admin;

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!isCustomUcmEmailTemplateKey(key)) {
    return NextResponse.json({ ok: false, error: "only_custom" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  await db.collection(UCM_EMAIL_TEMPLATES_COLLECTION).doc(key).delete();
  return NextResponse.json({ ok: true, deleted: key });
}
