import { extractTextFromHtml } from "@/lib/inspiration/extract-html-text";

const FETCH_TIMEOUT_MS = 16_000;
const MAX_HTML_BYTES = 900_000;
const SEARCH_TIMEOUT_MS = 10_000;

export type LinkedInProfileSection = {
  title: string;
  subtitle?: string;
  description?: string;
};

export type LinkedInPublicProfile = {
  name?: string;
  /** Full LinkedIn headline when available (search index or browse). */
  headline?: string;
  /** About / summary text (may be partial on guest pages). */
  about?: string;
  aboutTruncated?: boolean;
  description?: string;
  location?: string;
  currentCompany?: string;
  currentCompanies: string[];
  educations: string[];
  services: string[];
  languages: string[];
  certifications: string[];
  organizations: LinkedInProfileSection[];
  volunteering: LinkedInProfileSection[];
  recommendations: LinkedInProfileSection[];
  articles: LinkedInProfileSection[];
  honors: string[];
  followerCount?: number;
  /** Compact text bundle for LLM synthesis. */
  contextText: string;
};

function decodeHtmlEntities(value: string): string {
  let out = value;
  for (let i = 0; i < 3; i++) {
    const next = out
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\u003C/g, "<")
      .replace(/\u003E/g, ">")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
    if (next === out) break;
    out = next;
  }
  return out;
}

function metaContent(html: string, attr: "property" | "name", key: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`,
    "i",
  );
  const match = html.match(re) ?? html.match(alt);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function parseOgTitle(title: string): { name?: string; companyOrHeadline?: string } {
  const cleaned = title.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
  const dash = cleaned.indexOf(" - ");
  if (dash <= 0) return { name: cleaned || undefined };
  return {
    name: cleaned.slice(0, dash).trim() || undefined,
    companyOrHeadline: cleaned.slice(dash + 3).trim() || undefined,
  };
}

function isAboutTruncated(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /based in…|based in\.\.\.|voir plus|see more|show more|lire la suite/i.test(t) ||
    (t.length < 160 && /…/.test(t))
  );
}

function cleanSectionHtml(fragment: string): string {
  let text = fragment.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, "\n");
  return decodeHtmlEntities(text)
    .replace(/\*]:[^\n]*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSectionHtml(html: string, sectionId: string): string {
  const re = new RegExp(`data-section="${sectionId}"[\\s\\S]*?(?=data-section="|$)`, "i");
  const match = html.match(re);
  return match?.[0] ?? "";
}

function isNoiseLine(line: string): boolean {
  return (
    /data-section=|class=|\*\]:|core-section|border-|^[<>{}\[\]]/.test(line) ||
    /demander une proposition/i.test(line) ||
    /^(juil\.|janv\.|févr\.|mars |avr\.|mai |juin |août |sept\.|oct\.|nov\.|déc\.)/i.test(line) ||
    /^\d+\s*(ans|mois)/i.test(line) ||
    /^- aujourd/i.test(line)
  );
}

function linesFromSection(fragment: string, minLen = 2): string[] {
  const clean = cleanSectionHtml(fragment);
  return clean
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length >= minLen &&
        !isNoiseLine(l) &&
        !/^(voir plus|show more|show less|sign in|s'identifier|join now|inscrivez)/i.test(l),
    );
}

function parseSummarySection(fragment: string): { about?: string; truncated?: boolean } {
  const lines = linesFromSection(fragment);
  const aboutLines: string[] = [];
  let started = false;
  for (const line of lines) {
    if (/^(à propos|about)$/i.test(line)) {
      started = true;
      continue;
    }
    if (!started) continue;
    if (/^(bon retour|sign in|e-mail|mot de passe)/i.test(line)) break;
    aboutLines.push(line);
  }
  const about = aboutLines.join("\n").trim();
  if (!about) return {};
  return { about, truncated: isAboutTruncated(about) };
}

function parseListSection(fragment: string): string[] {
  const lines = linesFromSection(fragment);
  const items: string[] = [];
  for (const line of lines) {
    if (
      line.length > 2 &&
      line.length < 120 &&
      !/^\d/.test(line) &&
      !/^(services|langues|languages|publications|articles|licences|certifications|organisations|organisations)$/i.test(
        line,
      )
    ) {
      if (!items.includes(line)) items.push(line);
    }
  }
  return items.slice(0, 12);
}

function parseStructuredCards(fragment: string, limit = 6): LinkedInProfileSection[] {
  const lines = linesFromSection(fragment);
  const items: LinkedInProfileSection[] = [];
  let current: LinkedInProfileSection | null = null;

  const sectionHeaders =
    /^(à propos|about|services|publications|recommandations|langues|organisations|expériences|experience|certifications|projets|activité|expériences de bénévolat)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3 || isNoiseLine(line)) continue;
    if (sectionHeaders.test(line)) continue;

    const next = lines[i + 1];
    const next2 = lines[i + 2];

    if (line.length <= 90 && !/^\d/.test(line)) {
      if (current?.title) items.push(current);

      if (
        next &&
        next.length <= 80 &&
        !next.includes("·") &&
        next2 &&
        next2.length > 50
      ) {
        current = { title: line, subtitle: next, description: next2 };
        i += 2;
        continue;
      }

      if (next && next.includes("·") && next.length < 120) {
        current = { title: line, subtitle: next };
        i += 1;
        continue;
      }

      current = { title: line };
      continue;
    }

    if (!current) continue;
    if (line.length > 40) {
      current.description = current.description
        ? `${current.description}\n${line}`
        : line;
    }
  }
  if (current?.title && !isNoiseLine(current.title)) items.push(current);
  return items.filter((i) => !isNoiseLine(i.title)).slice(0, limit);
}

function parseMetaDescription(raw?: string): {
  aboutTeaser?: string;
  company?: string;
  education?: string;
  location?: string;
} {
  if (!raw) return {};
  const text = decodeHtmlEntities(raw);
  const parts = text.split("·").map((p) => p.trim());
  const aboutTeaser = parts[0]?.split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
  let company: string | undefined;
  let education: string | undefined;
  let location: string | undefined;
  for (const part of parts.slice(1)) {
    if (/^expérience|^experience/i.test(part)) company = part.replace(/^expérience\s*:\s*/i, "").replace(/^experience\s*:\s*/i, "");
    if (/^formation|^education/i.test(part)) education = part.replace(/^formation\s*:\s*/i, "").replace(/^education\s*:\s*/i, "");
    if (/^lieu|^location/i.test(part)) location = part.replace(/^lieu\s*:\s*/i, "").replace(/^location\s*:\s*/i, "");
  }
  return { aboutTeaser, company, education, location };
}

export function extractVanityFromLinkedInUrl(profileUrl: string): string | null {
  const match = profileUrl.trim().match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match?.[1]?.replace(/\/$/, "") ?? null;
}

/** Search-engine snippet often contains the full headline + about preview LinkedIn hides on guest pages. */
export async function fetchLinkedInSearchSnippet(
  vanity: string,
  profileUrl: string,
): Promise<{ headline?: string; about?: string } | null> {
  const queries = [`${vanity} linkedin`, `site:linkedin.com/in/${vanity}`, profileUrl];

  for (const q of queries) {
    try {
      const body = new URLSearchParams({ q });
      const res = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const linkedInResult = html.match(
        /class="result__a"[^>]*href="[^"]*linkedin\.com\/in\/[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!linkedInResult) continue;

      const title = decodeHtmlEntities(linkedInResult[1].replace(/<[^>]+>/g, "").trim());
      const snippet = decodeHtmlEntities(linkedInResult[2].replace(/<[^>]+>/g, "").trim());

      let headline: string | undefined;
      const titleDash = title.match(/\s[-–]\s(.+)$/);
      if (titleDash?.[1] && titleDash[1].length > 15 && !/linkedin/i.test(titleDash[1])) {
        headline = titleDash[1].replace(/\s*\.\.\.\s*$/, "").trim();
      }

      if (!headline && snippet.includes("|")) {
        const beforeDot = snippet.split("·")[0]?.trim();
        if (beforeDot && beforeDot.length > 20) headline = beforeDot;
      }

      let about: string | undefined;
      const dotParts = snippet.split("·").map((p) => p.trim()).filter(Boolean);
      for (const part of dotParts) {
        if (
          /^(catalyzing|based in|j'aide|j'accompagne|i help|accompagne)/i.test(part) &&
          part.length > 50
        ) {
          about = part;
          break;
        }
      }
      if (!about && dotParts.length > 1) {
        const candidate = dotParts[dotParts.length - 1];
        if (candidate.length > 60 && !candidate.includes("|")) about = candidate;
      }

      if (headline || about) {
        return {
          headline: headline?.slice(0, 220),
          about: about?.slice(0, 2000),
        };
      }
    } catch {
      /* try next query */
    }
  }
  return null;
}

function buildContextText(profile: Omit<LinkedInPublicProfile, "contextText">): string {
  const lines: string[] = [];
  const push = (label: string, value?: string | string[]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      if (value.length) lines.push(`${label}: ${value.join(" · ")}`);
    } else if (value.trim()) {
      lines.push(`${label}: ${value.trim()}`);
    }
  };

  push("name", profile.name);
  push("headline", profile.headline);
  push("about", profile.about);
  if (profile.aboutTruncated) lines.push("about_note: LinkedIn guest page truncates About — use headline + sections below.");
  push("location", profile.location);
  push("current_company", profile.currentCompany);
  push("companies", profile.currentCompanies);
  push("education", profile.educations);
  push("services", profile.services);
  push("languages", profile.languages);
  push("certifications", profile.certifications);
  push("honors", profile.honors);

  for (const v of profile.volunteering.slice(0, 4)) {
    lines.push(
      `volunteering: ${v.title}${v.subtitle ? ` (${v.subtitle})` : ""}${v.description ? ` — ${v.description.slice(0, 300)}` : ""}`,
    );
  }
  for (const o of profile.organizations.slice(0, 4)) {
    lines.push(
      `organization: ${o.title}${o.description ? ` — ${o.description.slice(0, 200)}` : ""}`,
    );
  }
  for (const a of profile.articles.slice(0, 3)) {
    lines.push(`article: ${a.title}${a.description ? ` — ${a.description.slice(0, 120)}` : ""}`);
  }

  lines.push(
    "instruction: Build positioningLine from about + headline + volunteering + services only. Ignore recommendations.",
  );

  return lines.join("\n").slice(0, 8000);
}

export async function fetchLinkedInPublicProfile(
  profileUrl: string,
): Promise<LinkedInPublicProfile | null> {
  const normalized = profileUrl.trim().replace(/\/$/, "");
  const vanity = extractVanityFromLinkedInUrl(normalized);

  const searchSnippet =
    vanity != null
      ? await fetchLinkedInSearchSnippet(vanity, normalized)
      : null;

  let res: Response;
  try {
    res = await fetch(normalized, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_HTML_BYTES) return null;

  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (!html.includes("linkedin.com")) return null;

  const ogTitle = metaContent(html, "property", "og:title") ?? metaContent(html, "name", "title");
  const ogDescription =
    metaContent(html, "property", "og:description") ??
    metaContent(html, "name", "description");
  const fromTitle = ogTitle ? parseOgTitle(ogTitle) : {};
  const fromMeta = parseMetaDescription(ogDescription);

  const summary = parseSummarySection(extractSectionHtml(html, "summary"));
  const positions = parseListSection(extractSectionHtml(html, "currentPositionsDetails"));
  const educations = parseListSection(extractSectionHtml(html, "educationsDetails"));
  const services = parseListSection(extractSectionHtml(html, "services"));
  const languages = parseListSection(extractSectionHtml(html, "languages"));
  const certifications = parseListSection(extractSectionHtml(html, "certifications"));
  const honors = parseListSection(extractSectionHtml(html, "honors-and-awards"));
  const organizations = parseStructuredCards(extractSectionHtml(html, "organizations"));
  const volunteering = parseStructuredCards(extractSectionHtml(html, "volunteering"));
  const recommendations = parseStructuredCards(extractSectionHtml(html, "recommendations"));
  const articles = parseStructuredCards(extractSectionHtml(html, "articles"));

  const name = fromTitle.name;
  const currentCompany =
    positions[0] ?? fromMeta.company ?? fromTitle.companyOrHeadline;
  const location = fromMeta.location;

  let headline = searchSnippet?.headline;
  if (headline && currentCompany && headline.toLowerCase() === currentCompany.toLowerCase()) {
    headline = undefined;
  }

  let about = searchSnippet?.about ?? summary.about ?? fromMeta.aboutTeaser;
  const aboutTruncated =
    summary.truncated ?? (about ? isAboutTruncated(about) : false);

  if (aboutTruncated && searchSnippet?.about && searchSnippet.about.length > (about?.length ?? 0)) {
    about = searchSnippet.about;
  }

  const description = about;

  const profileBase: Omit<LinkedInPublicProfile, "contextText"> = {
    name,
    headline,
    about,
    aboutTruncated,
    description,
    location,
    currentCompany,
    currentCompanies: positions,
    educations,
    services,
    languages,
    certifications,
    organizations,
    volunteering,
    recommendations,
    articles,
    honors,
  };

  const contextText = buildContextText(profileBase);
  if (!contextText.trim()) return null;

  return { ...profileBase, contextText };
}

export function extractPlainPageExcerpt(html: string): string {
  return extractTextFromHtml(html).slice(0, 2000);
}
