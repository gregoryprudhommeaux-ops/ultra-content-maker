import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import {
  buildProposalDraftFromInAppTemplates,
  configFromUnifiedTemplate,
  defaultInAppProposalTemplates,
  normalizeInAppProposalTemplates,
  unifiedTemplateFromConfig,
  type InAppProposalTemplateConfig,
  type InAppProposalTemplateLocale,
} from "@/lib/admin/support-proposal-inapp-template";
import type { SupportQuoteProposalInput } from "@/lib/admin/support-quote-proposal-shared";

function configRef(db: Firestore) {
  return db.collection("platform").doc("supportProposalInAppTemplate");
}

export async function getInAppProposalTemplates(db: Firestore): Promise<InAppProposalTemplateConfig> {
  const snap = await configRef(db).get();
  if (!snap.exists) return defaultInAppProposalTemplates();
  return normalizeInAppProposalTemplates(snap.data());
}

export async function saveInAppProposalTemplates(
  db: Firestore,
  input: InAppProposalTemplateConfig,
): Promise<InAppProposalTemplateConfig> {
  const unified = unifiedTemplateFromConfig(normalizeInAppProposalTemplates(input));
  const normalized = configFromUnifiedTemplate(unified);
  await configRef(db).set(
    {
      fr: normalized.fr,
      en: normalized.en,
      es: normalized.es,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return getInAppProposalTemplates(db);
}

export async function saveUnifiedInAppProposalTemplate(
  db: Firestore,
  template: InAppProposalTemplateLocale,
): Promise<InAppProposalTemplateConfig> {
  return saveInAppProposalTemplates(db, configFromUnifiedTemplate(template));
}

export async function buildProposalDraftForQuoteFromInAppTemplate(
  db: Firestore,
  row: SupportQuoteProposalInput,
) {
  const templates = await getInAppProposalTemplates(db);
  return buildProposalDraftFromInAppTemplates(row, templates);
}
