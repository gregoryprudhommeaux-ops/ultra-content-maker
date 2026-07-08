import { verifyBearerUserId } from "@/lib/api/verify-bearer-user";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  addBioDocumentFromFile,
  addBioDocumentFromLink,
  deleteBioDocumentServer,
  listBioDocumentsServer,
} from "@/lib/workspace/bio-documents.server";
import { canWriteWorkspace } from "@/lib/workspace/require-workspace-write.server";
import { resolveWorkspaceScopeForUser } from "@/lib/workspace/resolve-workspace-scope.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorStatus(code: string): number {
  if (
    code === "forbidden" ||
    code === "unsupported_file_type" ||
    code === "unsupported_link_type" ||
    code === "invalid_link" ||
    code === "file_too_large" ||
    code === "empty_extracted_text" ||
    code === "image_ocr_unavailable" ||
    code === "google_doc_not_accessible" ||
    code === "link_not_accessible"
  ) {
    return 400;
  }
  if (code === "not_found") return 404;
  return 500;
}

export async function GET(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const scope = await resolveWorkspaceScopeForUser(db, userId);
  if (!(await canWriteWorkspace(db, userId, scope.ownerId, scope.accountId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const documents = await listBioDocumentsServer(db, scope.ownerId, scope.accountId);
  return NextResponse.json({
    documents: documents.map((doc) => ({
      ...doc,
      extractedText: undefined,
      textPreview: doc.extractedText.slice(0, 280),
      textLength: doc.extractedText.length,
    })),
  });
}

export async function POST(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  const scope = await resolveWorkspaceScopeForUser(db, userId);
  if (!(await canWriteWorkspace(db, userId, scope.ownerId, scope.accountId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const linkUrl = String(form.get("linkUrl") ?? "").trim();
    const linkLabel = String(form.get("linkLabel") ?? "").trim();
    const file = form.get("file");

    let document;
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      document = await addBioDocumentFromFile(db, {
        ownerId: scope.ownerId,
        accountId: scope.accountId,
        fileName: file.name || "document",
        mimeType: file.type || "application/octet-stream",
        buffer,
      });
    } else if (linkUrl) {
      document = await addBioDocumentFromLink(db, {
        ownerId: scope.ownerId,
        accountId: scope.accountId,
        url: linkUrl,
        label: linkLabel || undefined,
      });
    } else {
      return NextResponse.json({ error: "missing_file_or_link" }, { status: 400 });
    }

    return NextResponse.json({
      document: {
        ...document,
        extractedText: undefined,
        textPreview: document.extractedText.slice(0, 280),
        textLength: document.extractedText.length,
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "upload_failed";
    return NextResponse.json({ error: code }, { status: errorStatus(code) });
  }
}

export async function DELETE(request: Request) {
  const userId = await verifyBearerUserId(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: { documentId?: string };
  try {
    body = (await request.json()) as { documentId?: string };
    if (!body.documentId?.trim()) throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const scope = await resolveWorkspaceScopeForUser(db, userId);
  if (!(await canWriteWorkspace(db, userId, scope.ownerId, scope.accountId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    await deleteBioDocumentServer(
      db,
      scope.ownerId,
      scope.accountId,
      body.documentId.trim(),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "delete_failed";
    return NextResponse.json({ error: code }, { status: errorStatus(code) });
  }
}
