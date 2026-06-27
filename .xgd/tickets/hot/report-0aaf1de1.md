---
uid: report-0aaf1de1
id: REPORT-639
type: report
title: 'Regression success: 2 caught (reconciliation)'
created_by: xgd
created_at: '2026-06-27T02:12:08.703752+00:00'
updated_at: '2026-06-27T02:12:08.703752+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: regression_success
  subject_uid: bundle-bbb1bd9c
  cycle: reconciliation
  intent_uid: bundle-bbb1bd9c
  regression_count: 2
---

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
    "description": null,
    "severity": null
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
    "description": null,
    "severity": null
  }
]