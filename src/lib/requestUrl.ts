// Build the externally-visible base URL from request headers (the host the
// browser actually used), so generated links/briefs work without hardcoding.
export function baseUrlFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}
