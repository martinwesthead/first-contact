---
uid: report-b3c5fba9
id: REPORT-642
type: report
title: 'Sync-main review: reconcile-BUNDLE-3'
created_by: xgd
created_at: '2026-06-27T02:19:31.105416+00:00'
updated_at: '2026-06-27T02:19:31.105416+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: sync_main_review
  subject_uid: reconcile-BUNDLE-3
---

{
  "findings": [
    {
      "risk": "OK",
      "file": "packages/extractor, packages/web-fetch-safety, apps/control-app/src/operator, apps/control-app/src/safety, tools/parity-audit.ts, .claude/settings.json",
      "description": "Briefing listed these as main-side '(deleted)' files present in the worktree, which would suggest resurrection. Verified false alarm: `git log main -- <path>` is empty for all of them — main's history never contained these paths, so main never deleted them. They are net-new additions by the bundle (REQ-13/20/21 feature packages: HTML extractor, web-fetch safety, operator dispatch, account/health safety, parity audit tool) plus their UATs. Not a deletion-revert. The briefing's '(deleted)' classification reflects branch->main diff direction (main lacks these), not main intent."
    },
    {
      "risk": "OK",
      "file": "apps/control-app/src/chat.ts, packages/builder-ui/src/{chat-driver,store,index,main}.ts, packages/builder-ui/src/components/chat-panel.ts",
      "description": "Modified files (880 insertions / 305 deletions vs main) are coherent forward evolution wiring the new operator/extractor/tool-result components into chat. merge-base(HEAD, main) = main (cacae5fe) means main contributed no commits past the base, so there is no main-side change for these edits to revert. No half-merged or incoherent state observed."
    },
    {
      "risk": "OK",
      "file": "(repository-wide)",
      "description": "No unresolved conflict markers found in any tracked file (.ts/.js/.json/.yaml/.yml/.toml/.py/.md). Conflict Files list was empty. Ancestry confirmed: origin/main(750f468) -> local main(cacae5fe) -> HEAD(234731d3), with local main fully contained in HEAD. strict_advance_gate passed (all main additions preserved) and the regression suite passed 76 UATs, indicating the replayed bundle composes correctly."
    }
  ]
}
