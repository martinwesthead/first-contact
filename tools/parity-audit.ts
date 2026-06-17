#!/usr/bin/env node
// Parity audit (REQ-9 scaffolding).
//
// Walks OPERATOR_ACTIONS and reports, per action, whether the declared
// `ui_route` is implemented. v1 is best-effort: state-edit tools currently
// have `ui_route: null` (chat-only); system actions list themselves. When
// UI consumers ship (REQ-12+), this script becomes the CI gate that fails
// if a registered action's ui_route is unimplemented in the builder UI.
//
// Run: pnpm tsx tools/parity-audit.ts
//      (or `node --experimental-strip-types tools/parity-audit.ts` on Node ≥22.6)
//
// Exit codes:
//   0  - all entries either have a known ui_route or are explicitly chat-only.
//   1  - one or more entries reference a ui_route that no builder UI module declares.

import { OPERATOR_ACTIONS } from "../apps/control-app/src/operator/registry.js";

type Row = {
  name: string;
  category: string;
  plan_tier: string;
  ui_route: string | null;
  status: "chat-only" | "ui-declared" | "ui-missing";
};

const rows: Row[] = OPERATOR_ACTIONS.map((a) => ({
  name: a.name,
  category: a.category,
  plan_tier: a.plan_tier,
  ui_route: a.ui_route,
  status: a.ui_route === null ? "chat-only" : ("ui-missing" as const),
}));

const COL_NAME = Math.max(...rows.map((r) => r.name.length), 4);
const COL_CAT = Math.max(...rows.map((r) => r.category.length), 8);
const COL_TIER = Math.max(...rows.map((r) => r.plan_tier.length), 9);

function pad(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - s.length));
}

console.log(
  `${pad("name", COL_NAME)}  ${pad("category", COL_CAT)}  ${pad("plan_tier", COL_TIER)}  ui_route                 status`,
);
console.log(
  `${"-".repeat(COL_NAME)}  ${"-".repeat(COL_CAT)}  ${"-".repeat(COL_TIER)}  ------------------------  ----------`,
);
for (const r of rows) {
  console.log(
    `${pad(r.name, COL_NAME)}  ${pad(r.category, COL_CAT)}  ${pad(r.plan_tier, COL_TIER)}  ${pad(r.ui_route ?? "(null)", 24)}  ${r.status}`,
  );
}

const missing = rows.filter((r) => r.status === "ui-missing");
if (missing.length > 0) {
  console.error(
    `\nparity-audit: ${missing.length} action(s) declare a ui_route that is not yet implemented:`,
  );
  for (const r of missing) {
    console.error(`  - ${r.name} → ${r.ui_route}`);
  }
  process.exit(1);
}
console.log("\nparity-audit: ok");
