import type { UcmTemplateLocale } from "@/lib/email/ucm-template-types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain-text body → branded HTML email shell for UCM. */
export function wrapUcmPlainBody(
  body: string,
  opts?: { lang?: UcmTemplateLocale },
): string {
  const lang = opts?.lang ?? "fr";
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\n/g, "<br/>");
      const linked = withBreaks.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color:#5a7a0f;text-decoration:underline;">$1</a>',
      );
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937;">${linked}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:18px 24px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;letter-spacing:0.02em;">
            Ultra Content Maker
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            ${paragraphs || `<p style="margin:0;color:#6b7280;">(empty)</p>`}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 20px;font-size:11px;line-height:1.4;color:#9ca3af;border-top:1px solid #f3f4f6;">
            LinkedIn content OS · NextStep Services
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
