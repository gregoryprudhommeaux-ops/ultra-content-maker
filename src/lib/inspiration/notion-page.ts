import { trimExcerpt } from "@/lib/inspiration/extract-html-text";

const NOTION_ORIGIN = "https://www.notion.so";
const NOTION_API = `${NOTION_ORIGIN}/api/v3`;
const NOTION_CLIENT_VERSION = "23.13.0.2800";
const FETCH_TIMEOUT_MS = 14_000;
const MIN_EXCERPT_CHARS = 40;
const CHUNK_LIMIT = 200;

type NotionRichText = [string, ...unknown[]];
type NotionBlockValue = {
  id?: string;
  type?: string;
  properties?: { title?: NotionRichText[] };
  content?: string[];
};

type NotionRecordMap = {
  block?: Record<string, { value?: NotionBlockValue | { value?: NotionBlockValue } }>;
};

export type NotionPageFetchResult = {
  excerpt: string;
  title?: string;
};

export function isNotionUrl(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    return (
      host === "notion.so" ||
      host.endsWith(".notion.so") ||
      host.endsWith(".notion.site")
    );
  } catch {
    return false;
  }
}

/** Extract and normalize a Notion page UUID from notion.so / notion.site URLs. */
export function parseNotionPageId(raw: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(raw.trim()).pathname;
  } catch {
    return null;
  }

  const tail = pathname.split("/").filter(Boolean).pop() ?? "";
  if (!tail) return null;

  const fromHyphen = tail.split("-").pop() ?? "";
  if (/^[a-f0-9]{32}$/i.test(fromHyphen)) {
    return normalizeNotionPageId(fromHyphen);
  }

  const match = tail.match(/([a-f0-9]{32})$/i);
  if (match) return normalizeNotionPageId(match[1]);

  if (/^[a-f0-9]{32}$/i.test(tail)) {
    return normalizeNotionPageId(tail);
  }

  return null;
}

function normalizeNotionPageId(id: string): string {
  const compact = id.replace(/-/g, "").toLowerCase();
  if (compact.length !== 32) return id;
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function parseNotionSpaceDomain(raw: string): string | null {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9-]+)\.notion\.site$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function richTextToPlain(title: unknown): string {
  if (!Array.isArray(title)) return "";
  return title
    .map((part) => (Array.isArray(part) && part[0] != null ? String(part[0]) : ""))
    .join("");
}

function unwrapBlock(entry: unknown): NotionBlockValue | null {
  if (!entry || typeof entry !== "object") return null;
  const outer = (entry as { value?: unknown }).value;
  if (!outer || typeof outer !== "object") return null;
  if ("value" in outer && outer.value && typeof outer.value === "object") {
    return outer.value as NotionBlockValue;
  }
  return outer as NotionBlockValue;
}

async function notionPost<T>(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "notion-client-version": NOTION_CLIENT_VERSION,
    },
    body: JSON.stringify(body),
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`notion_http_${res.status}`);
  }

  const json = (await res.json()) as T & { isNotionError?: boolean };
  if (json?.isNotionError) {
    throw new Error("notion_api_error");
  }
  return json;
}

type PublicPageData = {
  spaceDomain?: string;
  requireLogin?: boolean;
  publicAccessRole?: string;
};

async function resolveSpaceDomain(
  pageId: string,
  url: string,
): Promise<string | null> {
  const fromHost = parseNotionSpaceDomain(url);
  if (fromHost) return fromHost;

  const data = await notionPost<PublicPageData>(NOTION_API, "/getPublicPageData", {
    type: "block-space",
    blockId: pageId,
    requestedOnPublicDomain: true,
  });

  if (data.requireLogin) return null;
  if (!data.spaceDomain?.trim()) return null;
  return data.spaceDomain.trim();
}

async function loadPageRecordMap(
  spaceDomain: string,
  pageId: string,
): Promise<NotionRecordMap> {
  const apiBase = `https://${spaceDomain}.notion.site/api/v3`;

  const chunk = await notionPost<{ recordMap?: NotionRecordMap }>(
    apiBase,
    "/loadCachedPageChunkV2",
    {
      page: { id: pageId },
      limit: CHUNK_LIMIT,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false,
    },
  );

  const recordMap: NotionRecordMap = chunk.recordMap ?? { block: {} };
  const pageBlock = unwrapBlock(recordMap.block?.[pageId]);
  const missingIds = collectMissingChildIds(pageBlock?.content ?? [], recordMap);

  if (missingIds.length > 0) {
    try {
      const synced = await notionPost<{ recordMap?: NotionRecordMap }>(
        apiBase,
        "/syncRecordValues",
        {
          requests: missingIds.map((id) => ({
            id,
            table: "block",
            version: -1,
          })),
        },
      );

      recordMap.block = {
        ...(recordMap.block ?? {}),
        ...(synced.recordMap?.block ?? {}),
      };
    } catch {
      /* partial chunk is better than failing the whole fetch */
    }
  }

  return recordMap;
}

function collectMissingChildIds(
  rootIds: string[],
  recordMap: NotionRecordMap,
  max = 80,
): string[] {
  const missing: string[] = [];
  const queue = [...rootIds];
  const seen = new Set<string>();

  while (queue.length > 0 && missing.length < max) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);

    const block = unwrapBlock(recordMap.block?.[id]);
    if (!block) {
      missing.push(id);
      continue;
    }

    for (const childId of block.content ?? []) {
      queue.push(childId);
    }
  }

  return missing;
}

function blockTextLine(type: string, text: string): string {
  if (!text.trim()) return "";
  if (
    type === "header" ||
    type === "sub_header" ||
    type === "sub_sub_header" ||
    type === "heading_1" ||
    type === "heading_2" ||
    type === "heading_3"
  ) {
    return `\n${text.trim()}\n`;
  }
  if (type === "bulleted_list" || type === "numbered_list") {
    return `• ${text.trim()}`;
  }
  if (type === "to_do") {
    return `- ${text.trim()}`;
  }
  if (type === "quote" || type === "callout") {
    return `> ${text.trim()}`;
  }
  if (type === "code") {
    return text.trim();
  }
  if (type === "page") {
    return `\n${text.trim()}\n`;
  }
  return text.trim();
}

function collectPageText(
  blockId: string,
  recordMap: NotionRecordMap,
  lines: string[],
  visited: Set<string>,
): void {
  if (visited.has(blockId)) return;
  visited.add(blockId);

  const block = unwrapBlock(recordMap.block?.[blockId]);
  if (!block) return;

  const type = block.type ?? "text";
  const text = richTextToPlain(block.properties?.title);
  const line = blockTextLine(type, text);
  if (line && type !== "page") {
    lines.push(line);
  }

  for (const childId of block.content ?? []) {
    collectPageText(childId, recordMap, lines, visited);
  }
}

function recordMapToText(pageId: string, recordMap: NotionRecordMap): {
  title?: string;
  body: string;
} {
  const pageBlock = unwrapBlock(recordMap.block?.[pageId]);
  if (!pageBlock) return { body: "" };

  const title = richTextToPlain(pageBlock.properties?.title).trim() || undefined;
  const lines: string[] = [];
  const visited = new Set<string>([pageId]);

  for (const childId of pageBlock.content ?? []) {
    collectPageText(childId, recordMap, lines, visited);
  }

  const body = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, body };
}

export async function fetchNotionPageExcerpt(
  url: string,
): Promise<NotionPageFetchResult | null> {
  const pageId = parseNotionPageId(url);
  if (!pageId) return null;

  const spaceDomain = await resolveSpaceDomain(pageId, url);
  if (!spaceDomain) return null;

  const recordMap = await loadPageRecordMap(spaceDomain, pageId);
  const { title, body } = recordMapToText(pageId, recordMap);

  const excerpt = trimExcerpt(
    title && body ? `${title}\n\n${body}` : title || body,
  );

  if (excerpt.length < MIN_EXCERPT_CHARS) return null;

  return {
    excerpt,
    title,
  };
}
