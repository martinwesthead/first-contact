import {
  NOT_DETECTED,
  type AssetKind,
  type AssetRecord,
  type ReferenceDigest,
} from "./schema.js";

const SECTIONS: ReadonlyArray<{ key: string; title: string }> = [
  { key: "palette", title: "Palette" },
  { key: "typography", title: "Typography" },
  { key: "layout", title: "Layout" },
  { key: "imagery", title: "Imagery" },
  { key: "content", title: "Content" },
  { key: "assetInventory", title: "Asset Inventory" },
];

/**
 * renderDigestMarkdown — produces the KMS-aware markdown body per DOC-9 §9:
 *
 *   1. H1 title (exactly one)
 *   2. Blockquote summary (the AI commentary pass output)
 *   3. ## Table of contents
 *   4. Numbered ## sections — one per signal category
 *   5. ## What's missing — list from `commentary.whatsMissing`
 *
 * The asset-inventory section renders one sub-list per kind so the operator
 * can see counts at a glance (img / background / video).
 */
export function renderDigestMarkdown(digest: ReferenceDigest): string {
  const out: string[] = [];
  out.push(`# Reference Digest — ${digest.sourceUrl}`);
  out.push("");
  out.push(`> ${digest.summary || "(no summary)"}`);
  out.push("");
  out.push("## Table of contents");
  out.push("");
  SECTIONS.forEach((s, i) => {
    out.push(`${i + 1}. [${s.title}](#${slug(s.title)})`);
  });
  out.push("");

  out.push("## 1. Palette");
  out.push("");
  out.push(`- Background: ${digest.signals.palette.background}`);
  out.push(`- Body: ${digest.signals.palette.body}`);
  out.push(`- Accent: ${digest.signals.palette.accent}`);
  out.push(`- CTA: ${digest.signals.palette.cta}`);
  if (digest.signals.palette.supporting.length > 0) {
    out.push(`- Supporting: ${digest.signals.palette.supporting.join(", ")}`);
  } else {
    out.push(`- Supporting: (none)`);
  }
  appendCommentary(out, digest, "palette");
  out.push("");

  out.push("## 2. Typography");
  out.push("");
  const t = digest.signals.typography;
  out.push(`- Body: ${typeStyleLine(t.body)}`);
  out.push(`- H1: ${typeStyleLine(t.h1)}`);
  out.push(`- H2: ${typeStyleLine(t.h2)}`);
  out.push(`- H3: ${typeStyleLine(t.h3)}`);
  out.push(
    `- Primary pair: ${
      t.primaryPair === NOT_DETECTED
        ? NOT_DETECTED
        : `${t.primaryPair.heading} / ${t.primaryPair.body}`
    }`,
  );
  appendCommentary(out, digest, "typography");
  out.push("");

  out.push("## 3. Layout");
  out.push("");
  out.push(
    `- Max content width: ${
      digest.signals.layout.maxContentWidth === NOT_DETECTED
        ? NOT_DETECTED
        : `${digest.signals.layout.maxContentWidth}px`
    }`,
  );
  out.push(`- Bias: ${digest.signals.layout.bias}`);
  out.push(`- Density: ${digest.signals.layout.density}`);
  appendCommentary(out, digest, "layout");
  out.push("");

  out.push("## 4. Imagery");
  out.push("");
  out.push(`- Images: ${digest.signals.imagery.imgCount}`);
  out.push(`- Backgrounds: ${digest.signals.imagery.backgroundCount}`);
  out.push(`- Videos: ${digest.signals.imagery.videoCount}`);
  out.push(`- Hero detected: ${digest.signals.imagery.heroDetected ? "yes" : "no"}`);
  appendCommentary(out, digest, "imagery");
  out.push("");

  out.push("## 5. Content");
  out.push("");
  const c = digest.signals.content;
  if (c.headings.length > 0) {
    out.push("- Headings:");
    for (const h of c.headings) {
      out.push(`  - H${h.level}: ${escapeMd(h.text)}`);
    }
  } else {
    out.push("- Headings: (none)");
  }
  out.push(`- Sections: ${c.sectionCount}`);
  out.push(`- List groups: ${c.listGroupCount}`);
  if (c.navLinks.length > 0) {
    out.push("- Nav links:");
    for (const l of c.navLinks) out.push(`  - ${escapeMd(l.text)} → ${l.href}`);
  } else {
    out.push("- Nav links: (none)");
  }
  if (c.formFields.length > 0) {
    out.push("- Form fields:");
    for (const f of c.formFields) {
      out.push(`  - ${escapeMd(f.name)} (${f.kind})`);
    }
  } else {
    out.push("- Form fields: (none)");
  }
  appendCommentary(out, digest, "content");
  out.push("");

  out.push("## 6. Asset Inventory");
  out.push("");
  const inv = digest.signals.assetInventory;
  appendInventoryGroup(out, inv, "img", "Images");
  appendInventoryGroup(out, inv, "background", "Backgrounds");
  appendInventoryGroup(out, inv, "video", "Videos");
  appendCommentary(out, digest, "assetInventory");
  out.push("");

  out.push("## What's missing");
  out.push("");
  if (digest.commentary.whatsMissing.length === 0) {
    out.push("- (nothing — every signal category produced data)");
  } else {
    for (const item of digest.commentary.whatsMissing) {
      out.push(`- ${item}`);
    }
  }
  out.push("");

  return out.join("\n");
}

function appendInventoryGroup(
  out: string[],
  inventory: ReadonlyArray<AssetRecord>,
  kind: AssetKind,
  title: string,
): void {
  const matching = inventory.filter((a) => a.kind === kind);
  out.push(`### ${title} (${matching.length})`);
  out.push("");
  if (matching.length === 0) {
    out.push("- (none)");
    out.push("");
    return;
  }
  for (const a of matching) {
    const dims =
      typeof a.width === "number" && typeof a.height === "number"
        ? ` ${a.width}×${a.height}`
        : "";
    const refs = a.references > 1 ? ` ×${a.references}` : "";
    const alt = a.alt ? ` — alt: "${escapeMd(a.alt)}"` : "";
    out.push(`- [${a.classification}${dims}${refs}] ${a.url}${alt}`);
  }
  out.push("");
}

function appendCommentary(
  out: string[],
  digest: ReferenceDigest,
  section: string,
): void {
  const text = digest.commentary.perSection[section];
  if (text && text.trim().length > 0) {
    out.push("");
    out.push(`_${text.trim()}_`);
  }
}

function typeStyleLine(s: {
  family: string;
  size: string;
  weight: string;
}): string {
  return `family=${s.family}, size=${s.size}, weight=${s.weight}`;
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeMd(text: string): string {
  return text.replace(/[\\`*_{}\[\]()#+\-.!]/g, (m) => `\\${m}`);
}
