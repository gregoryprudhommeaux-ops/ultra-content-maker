import type { WeeklyDigestPayload } from "@/lib/admin/admin-weekly-digest.server";

const RESEND_API = "https://api.resend.com/emails";

function adminEmail(): string {
  return (
    process.env.ADMIN_WEEKLY_DIGEST_EMAIL?.trim() ||
    process.env.ADMIN_ERROR_REPORT_EMAIL?.trim() ||
    process.env.ADMIN_LOGIN_NOTIFY_EMAIL?.trim() ||
    "gregory.prudhommeaux@gmail.com"
  );
}

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDelta(delta: number | null): string {
  if (delta == null) return "N/D (1er digest)";
  const sign = delta > 0 ? "+" : "";
  return `${sign}$${delta.toFixed(0)}`;
}

function renderRows(rows: WeeklyDigestPayload["blockedTop"], empty: string): string {
  if (rows.length === 0) {
    return `<p style="color:#64748b;font-size:14px;">${escapeHtml(empty)}</p>`;
  }
  const items = rows
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.email)}</strong>${row.displayName ? ` (${escapeHtml(row.displayName)})` : ""}<br/><span style="color:#64748b;font-size:13px;">${escapeHtml(row.detail)}</span></li>`,
    )
    .join("");
  return `<ul style="margin:8px 0;padding-left:20px;line-height:1.5;">${items}</ul>`;
}

function buildHtml(payload: WeeklyDigestPayload): string {
  const mrrDeltaColor =
    payload.mrrDeltaUsd == null
      ? "#64748b"
      : payload.mrrDeltaUsd >= 0
        ? "#15803d"
        : "#b91c1c";

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:640px;">
  <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;font-weight:700;margin:0 0 8px;">Ultra Content Maker</p>
  <h1 style="font-size:22px;margin:0 0 4px;">Digest hebdomadaire admin</h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${escapeHtml(payload.periodLabel)}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
    <tr>
      <td style="padding:12px;border:1px solid #e2e8f0;border-radius:8px 0 0 0;background:#f8fafc;"><strong>MRR théorique</strong><br/>$${payload.mrrUsd}</td>
      <td style="padding:12px;border:1px solid #e2e8f0;border-left:none;background:#f8fafc;color:${mrrDeltaColor};"><strong>Δ vs semaine -1</strong><br/>${formatDelta(payload.mrrDeltaUsd)}</td>
      <td style="padding:12px;border:1px solid #e2e8f0;border-left:none;border-radius:0 8px 0 0;background:#f8fafc;"><strong>Marge brute est.</strong><br/>$${payload.grossMarginUsd.toFixed(0)}</td>
    </tr>
    <tr>
      <td style="padding:12px;border:1px solid #e2e8f0;border-top:none;"><strong>Utilisateurs</strong><br/>${payload.registeredUsers} <span style="color:#64748b;">(+${payload.newSignups7d} / 7j)</span></td>
      <td style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-left:none;"><strong>Actifs (7j)</strong><br/>${payload.activeUsersWeek}</td>
      <td style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-left:none;"><strong>Posts validés</strong><br/>${payload.validatedArticles}</td>
    </tr>
    <tr>
      <td style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 0 8px;"><strong>Coût LLM (7j)</strong><br/>$${payload.llmCost7dUsd.toFixed(2)}</td>
      <td style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-left:none;"><strong>Erreurs ouvertes</strong><br/>${payload.openErrorReports}</td>
      <td style="padding:12px;border:1px solid #e2e8f0;border-top:none;border-left:none;border-radius:0 0 8px 0;"><strong>Virements</strong><br/>${payload.pendingWireTransfers} en attente · ${payload.wireSentCount} signalés</td>
    </tr>
  </table>

  <p style="font-size:13px;color:#64748b;margin:0 0 16px;">
    Tiers : FREE TEST ${payload.tierCounts.free_test} · Pro ${payload.tierCounts.pro} · Pro+ ${payload.tierCounts.pro_plus} · Support ${payload.tierCounts.support} · Expiré ${payload.tierCounts.expired}
  </p>

  <h2 style="font-size:16px;margin:24px 0 8px;">À surveiller (top 5 bloqués)</h2>
  ${renderRows(payload.blockedTop, "Aucun utilisateur bloqué cette semaine.")}

  <h2 style="font-size:16px;margin:24px 0 8px;">Coût LLM plateforme (top 5 / 7j)</h2>
  ${renderRows(payload.costlyTop, "Aucune consommation LLM plateforme significative.")}

  <h2 style="font-size:16px;margin:24px 0 8px;">Support Total · livraison</h2>
  ${renderRows(payload.supportAlerts, "Tous les comptes Support sont dans les clous.")}

  <p style="margin-top:32px;">
    <a href="${escapeHtml(payload.adminUrl)}" style="display:inline-block;background:#1e1b4b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ouvrir le cockpit admin</a>
  </p>
  <p style="font-size:11px;color:#94a3b8;margin-top:24px;">Généré le ${escapeHtml(new Date(payload.generatedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }))} (Paris)</p>
</div>
`.trim();
}

export function isAdminDigestEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendAdminWeeklyDigestEmail(payload: WeeklyDigestPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const deltaPart =
    payload.mrrDeltaUsd != null
      ? ` (${payload.mrrDeltaUsd >= 0 ? "+" : ""}$${payload.mrrDeltaUsd.toFixed(0)})`
      : "";
  const subject = `[UCM] Digest hebdo · MRR $${payload.mrrUsd}${deltaPart}`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [adminEmail()],
      subject,
      html: buildHtml(payload),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
