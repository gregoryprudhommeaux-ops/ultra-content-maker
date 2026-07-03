import {
  getInAppProposalTemplates,
  saveInAppProposalTemplates,
  saveUnifiedInAppProposalTemplate,
} from "@/lib/admin/support-proposal-inapp-template.server";
import {
  PROPOSAL_TEMPLATE_PLACEHOLDERS,
  SAMPLE_PREVIEW_QUOTE,
  configFromUnifiedTemplate,
  defaultInAppProposalTemplates,
  renderProposalFromInAppTemplate,
  unifiedTemplateFromConfig,
  type InAppProposalTemplateConfig,
  type InAppProposalTemplateLocale,
} from "@/lib/admin/support-proposal-inapp-template";
import type { QuoteContentLocale } from "@/lib/admin/support-quote-proposal-shared";
import { defaultCommercialTermsForPlan } from "@/lib/admin/support-deal-terms";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const templates = await getInAppProposalTemplates(db);
  const unified = unifiedTemplateFromConfig(templates);
  return NextResponse.json({
    templates,
    unified,
    defaults: defaultInAppProposalTemplates(),
    placeholders: PROPOSAL_TEMPLATE_PLACEHOLDERS,
  });
}

type PatchBody = {
  templates?: InAppProposalTemplateConfig;
  unified?: InAppProposalTemplateLocale;
  previewLocale?: QuoteContentLocale;
  resetToDefaults?: boolean;
};

export async function PATCH(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    if (body.previewLocale) {
      const unified =
        body.unified ??
        (body.templates ? unifiedTemplateFromConfig(body.templates) : unifiedTemplateFromConfig(await getInAppProposalTemplates(db)));
      const templates = configFromUnifiedTemplate(unified);
      const preview = renderProposalFromInAppTemplate(
        {
          ...SAMPLE_PREVIEW_QUOTE,
          commercialTerms: defaultCommercialTermsForPlan("starter"),
        },
        body.previewLocale,
        templates[body.previewLocale],
      );
      return NextResponse.json({ preview });
    }

    if (body.resetToDefaults) {
      const templates = await saveUnifiedInAppProposalTemplate(
        db,
        unifiedTemplateFromConfig(defaultInAppProposalTemplates()),
      );
      return NextResponse.json({
        templates,
        unified: unifiedTemplateFromConfig(templates),
      });
    }

    if (body.unified) {
      const templates = await saveUnifiedInAppProposalTemplate(db, body.unified);
      return NextResponse.json({
        templates,
        unified: unifiedTemplateFromConfig(templates),
      });
    }

    if (!body.templates) {
      return NextResponse.json({ error: "missing_templates" }, { status: 400 });
    }

    const templates = await saveInAppProposalTemplates(db, body.templates);
    return NextResponse.json({
      templates,
      unified: unifiedTemplateFromConfig(templates),
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}
