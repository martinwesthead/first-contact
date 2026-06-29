---
uid: report-b7bbf7fb
id: REPORT-773
type: report
title: 'Sync-main review: reconcile-BUNDLE-5'
created_by: xgd
created_at: '2026-06-29T00:54:08.557655+00:00'
updated_at: '2026-06-29T00:54:08.557655+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: sync_main_review
  subject_uid: reconcile-BUNDLE-5
---

{
  "findings": [
    {
      "risk": "OK",
      "file": "packages/extractor/src/html-to-markdown.ts",
      "description": "Briefing marked this and 3 sibling source files as (deleted) yet they are present in the worktree (also packages/framework/src/render/markdown.ts, apps/control-app/src/operator/write-text-asset.ts, packages/builder-ui/src/empty-scaffold.ts). NOT a resurrection of main's intent. Verified against true merge-base 409c95b8: all four were ABSENT at the merge-base and are ABSENT in main -- main never had them and never deleted them (git diff --diff-filter=D mergebase..main shows no such deletions). They are branch-original REQ-33/34 feature files added by FREE-CODED commits baa66657/aaffb46a, are live-wired in HEAD (htmlToMarkdown imported by operator/transcribe-site.ts; writeTextAssetHandler registered in operator/registry.ts; render/index.ts imports ./markdown.js), and internally consistent. Legitimate reconcile additions; briefing '(deleted)' markers are stale bookkeeping."
    },
    {
      "risk": "OK",
      "file": "(repository-wide)",
      "description": "Authoritative semantic-revert sweep, independent of the stale briefing: enumerated all 55 paths main DELETED and 2 paths main RENAMED (hot->cold ticket moves) since merge-base 409c95b8; 0 reappear in HEAD. No unresolved conflict markers in any tracked .py/.yaml/.yml or other file. Conflict file .xgd/tickets/hot/story-067dc2f8.md resolved with no markers. No rebase-merge/rebase-apply in progress; worktree clean; main is an ancestor of HEAD. Mechanical baseline (strict_advance_gate) already passed per workflow."
    }
  ]
}
