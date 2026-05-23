const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "metadata.goog",
]);

/** Reject URLs that must not be fetched server-side (SSRF mitigation). */
export function assertSafePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("url_invalid");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("url_invalid");
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw new Error("url_blocked");
  }

  if (isPrivateOrLocalHost(host)) {
    throw new Error("url_blocked");
  }

  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (![80, 443, 8080, 8443].includes(port)) {
    throw new Error("url_blocked");
  }

  return url;
}

function isPrivateOrLocalHost(host: string): boolean {
  if (host.includes(":")) {
    return isPrivateIpv6(host);
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const parts = ipv4.slice(1, 5).map((p) => Number(p));
  if (parts.some((p) => p > 255)) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "::1" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80")
  );
}

export function isLinkedInUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
}
