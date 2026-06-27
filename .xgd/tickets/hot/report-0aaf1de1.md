---
uid: report-0aaf1de1
id: REPORT-639
type: report
title: 'Regression success: 2 caught (reconciliation)'
created_by: xgd
created_at: '2026-06-27T02:12:08.703752+00:00'
updated_at: '2026-06-27T02:12:55.042350+00:00'
completed_at: null
last_field_updated: body
fields:
  report_kind: regression_success
  subject_uid: bundle-bbb1bd9c
  cycle: reconciliation
  intent_uid: bundle-bbb1bd9c
  regression_count: 2
---

Regression annotation: both regressions caught during reconciliation of bundle-bbb1bd9c have been triaged with a user-facing description and a severity rating. AC-486 (Builder chat proxy) is rated critical as it disables the core AI builder; AC-548 (operator SSE stream) is rated high as it breaks real-time operator updates.

[
  {
    "id": "reg-001",
    "capability_uid": "capability-6694c60f",
    "capability_name": "Builder UI",
    "story_uid": "story-ba9f2715",
    "ac_uid": "acceptance_criterion-88cbfc9e",
    "ac_human_id": "AC-486",
    "ac_summary": "POST /api/chat proxies the Anthropic Messages API and returns extracted text and tool_use blocks",
    "failing_uats": [
      "UAT AC-486: POST /api/chat proxies the Anthropic Messages API and returns extracted text and tool_use blocks test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks"
    ],
    "fix_plan_summary": "{\n  \"items\": [\n    {\n      \"index\": 0,\n      \"tests\": [\n        \"UAT AC-486: POST /api/chat proxies the Anthropic Messages API and returns extracted text and tool_use blocks test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks\",\n        \"Story story-a07c8ed3: Operator action dispatch namespace, plan-tier auth, SSE channel test_UAT_AC548_sse_endpoint_streams_five_event_types_heartbeats_and_closes_cleanly\"\n      ],\n      \"dependency_tests\": [],\n      \"instructio",
    "resolved": true,
    "description": "The AI chat endpoint that powers the Builder UI stopped forwarding requests to the Anthropic Messages API and returning the assistant's extracted text and tool_use blocks, leaving users unable to get any responses from the AI site builder.",
    "severity": "critical"
  },
  {
    "id": "reg-002",
    "capability_uid": "capability-f14050e3",
    "capability_name": "Operator API",
    "story_uid": "story-a07c8ed3",
    "ac_uid": "acceptance_criterion-2f17b6c9",
    "ac_human_id": "AC-548",
    "ac_summary": "SSE endpoint streams the five event types, heartbeats, and closes cleanly on disconnect",
    "failing_uats": [
      "Story story-a07c8ed3: Operator action dispatch namespace, plan-tier auth, SSE channel test_UAT_AC548_sse_endpoint_streams_five_event_types_heartbeats_and_closes_cleanly"
    ],
    "fix_plan_summary": "{\n  \"items\": [\n    {\n      \"index\": 0,\n      \"tests\": [\n        \"UAT AC-486: POST /api/chat proxies the Anthropic Messages API and returns extracted text and tool_use blocks test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks\",\n        \"Story story-a07c8ed3: Operator action dispatch namespace, plan-tier auth, SSE channel test_UAT_AC548_sse_endpoint_streams_five_event_types_heartbeats_and_closes_cleanly\"\n      ],\n      \"dependency_tests\": [],\n      \"instructio",
    "resolved": true,
    "description": "The operator SSE endpoint stopped streaming its five event types and heartbeats and closing cleanly on disconnect, so the operator console lost its real-time live updates.",
    "severity": "high"
  }
]