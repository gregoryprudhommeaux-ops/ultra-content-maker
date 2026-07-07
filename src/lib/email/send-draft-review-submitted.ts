const RESEND_API = "https://api.resend.com/emails";

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Ultra Content Maker <onboarding@resend.dev>"
  );
}

function adminEmail(): string {
  return (
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.ADMIN_ERROR_REPORT_EMAIL?.trim() ||
    process.env.ADMIN_LOGIN_NOTIFY_EMAIL?.trim() ||
    "gregory.prudhommeaux@gmail.com"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDraftReviewSubmittedEmail(input: {
  ownerId: string;
  accountId: string;
  articleId: string;
  hook: string;
  answers: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "resend_not_configured" };

  const answersHtml = Object.entries(input.answers)
    .filter(([, v]) => v.trim())
    .map(
      ([key, value]) =>
        `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value.trim())}</li>`,
    )
    .join("");

  const subject = `[UCM] Draft review submitted · ${input.hook.slice(0, 60)}`;
  const html = `
<p><strong>Client draft review submitted</strong></p>
<ul>
  <li><strong>Owner:</strong> ${escapeHtml(input.ownerId)}</li>
  <li><strong>Account:</strong> ${escapeHtml(input.accountId)}</li>
  <li><strong>Article:</strong> ${escapeHtml(input.articleId)}</li>
</ul>
<p><strong>Hook:</strong> ${escapeHtml(input.hook)}</p>
<ul>${answersHtml}</ul>
`.trim();

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
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, error: detail || `resend_${res.status}` };
  }
  return { ok: true };
}
