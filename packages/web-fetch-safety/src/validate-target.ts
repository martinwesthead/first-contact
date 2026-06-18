import type { SsrfDetail, TargetCheck, ValidateTargetOptions } from "./types.js";

const ALLOWED_SCHEMES_ALWAYS = new Set(["https:"]);
const ALLOWED_SCHEMES_CONDITIONAL = new Set(["http:"]);

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
]);

const METADATA_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata",
  "metadata.aws.internal",
  "metadata.azure.internal",
  "169.254.169.254",
]);

function stripIpv6Brackets(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }
  return host;
}

function parseIpv4(host: string): [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const out: number[] = [];
  for (const p of parts) {
    if (p.length === 0 || !/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    out.push(n);
  }
  return out as [number, number, number, number];
}

function ipv4Detail(o: [number, number, number, number]): SsrfDetail | null {
  const [a, b, c, d] = o;
  if (a === 127) return "loopback";
  if (a === 10) return "private_ip";
  if (a === 172 && b >= 16 && b <= 31) return "private_ip";
  if (a === 192 && b === 168) return "private_ip";
  if (a === 169 && b === 254) {
    if (c === 169 && d === 254) return "metadata_host";
    return "link_local";
  }
  if (a === 0) return "unspecified";
  if (a === 255 && b === 255 && c === 255 && d === 255) return "broadcast";
  return null;
}

function parseIpv6(host: string): number[] | null {
  const bare = stripIpv6Brackets(host);
  if (!bare.includes(":")) return null;
  const zone = bare.indexOf("%");
  const addr = zone === -1 ? bare : bare.slice(0, zone);
  const dblIdx = addr.indexOf("::");
  let groups: string[];
  if (dblIdx === -1) {
    groups = addr.split(":");
    if (groups.length !== 8) return null;
  } else {
    const left = addr.slice(0, dblIdx);
    const right = addr.slice(dblIdx + 2);
    const lg = left.length ? left.split(":") : [];
    const rg = right.length ? right.split(":") : [];
    const fill = 8 - lg.length - rg.length;
    if (fill < 0) return null;
    groups = [...lg, ...Array(fill).fill("0"), ...rg];
  }
  const out: number[] = [];
  for (const g of groups) {
    if (g.length === 0 || g.length > 4 || !/^[0-9a-fA-F]+$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  if (out.length !== 8) return null;
  return out;
}

function ipv6Detail(o: number[]): SsrfDetail | null {
  if (o.every((g) => g === 0)) return "unspecified";
  if (o.slice(0, 7).every((g) => g === 0) && o[7] === 1) return "loopback";
  if ((o[0] & 0xffc0) === 0xfe80) return "link_local";
  if ((o[0] & 0xfe00) === 0xfc00) return "private_ip"; // ULA fc00::/7
  if (o[0] === 0 && o[1] === 0 && o[2] === 0 && o[3] === 0 && o[4] === 0 && o[5] === 0xffff) {
    const v4 = [o[6] >> 8, o[6] & 0xff, o[7] >> 8, o[7] & 0xff] as [number, number, number, number];
    return ipv4Detail(v4);
  }
  return null;
}

export function classifyHost(rawHost: string): SsrfDetail | null {
  const host = stripIpv6Brackets(rawHost).toLowerCase();
  if (host.length === 0) return null;

  if (LOOPBACK_HOSTNAMES.has(host)) return "loopback";
  if (METADATA_HOSTNAMES.has(host)) return "metadata_host";

  const v4 = parseIpv4(host);
  if (v4) return ipv4Detail(v4);

  const v6 = parseIpv6(host);
  if (v6) return ipv6Detail(v6);

  return null;
}

export function validateTarget(
  input: string | URL,
  opts: ValidateTargetOptions = {},
): TargetCheck {
  let url: URL;
  try {
    url = typeof input === "string" ? new URL(input) : input;
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  // 1) Schemes that don't carry a network host (file:, data:, gopher:, ftp:, …)
  //    are rejected up-front — the protocol itself is the issue. Only http: and
  //    https: get past this gate.
  if (
    !ALLOWED_SCHEMES_ALWAYS.has(url.protocol) &&
    !ALLOWED_SCHEMES_CONDITIONAL.has(url.protocol)
  ) {
    return { ok: false, reason: "disallowed_scheme", detail: url.protocol };
  }

  if (!url.hostname) {
    return { ok: false, reason: "missing_host" };
  }

  // 2) SSRF on the literal hostname beats scheme issues — a redirect to
  //    http://127.0.0.1 is an exfiltration attempt regardless of scheme.
  const detail = classifyHost(url.hostname);
  if (detail) {
    return { ok: false, reason: "private_ip", detail };
  }

  // 3) http: only if the caller previously approved it for this exact origin
  //    (same-https-origin-in-same-chat policy from DOC-9).
  if (ALLOWED_SCHEMES_CONDITIONAL.has(url.protocol)) {
    if (!opts.allowHttpForOrigin) {
      return { ok: false, reason: "disallowed_scheme", detail: "http_not_allowed" };
    }
    const targetOrigin = `${url.protocol}//${url.host}`;
    const httpsEquivalent = targetOrigin.replace(/^http:/, "https:");
    if (httpsEquivalent !== opts.allowHttpForOrigin) {
      return { ok: false, reason: "disallowed_scheme", detail: "http_origin_mismatch" };
    }
  }

  return { ok: true, url };
}
