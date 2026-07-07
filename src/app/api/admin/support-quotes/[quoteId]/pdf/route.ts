import { generateSupportProposalPdf } from "@/lib/admin/support-proposal-pdf.server";
import { clientLocaleForQuote } from "@/lib/admin/support-quote-proposal-shared";
import { getSupportQuote } from "@/lib/admin/support-quotes.server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin.server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ quoteId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePlatformAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const { quoteId } = await context.params;
  const row = await getSupportQuote(db, quoteId);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale =
    localeParam === "en" || localeParam === "es" || localeParam === "fr"
      ? localeParam
      : clientLocaleForQuote(row);

  try {
    const buffer = await generateSupportProposalPdf(row, locale);
    const safeName = (row.companyName || row.fullName || "proposal")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="support-proposal-${safeName || quoteId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: "pdf_failed", detail }, { status: 500 });
  }
}
