---
uid: report-b7cd43a2
id: REPORT-353
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-19T23:27:10.281885+00:00'
updated_at: '2026-06-19T23:27:10.281885+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-19T23:26:43.827946Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 7.491698488593102e-05,
    "errors": 0,
    "warnings": 0,
    "error_list": [],
    "warning_list": []
  },
  "build": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.0,
    "errors": 0,
    "error_list": []
  },
  "preflight": {
    "status": "pass",
    "violations": []
  },
  "suites": {
    "javascript-vitest": {
      "suite_name": "javascript-vitest",
      "status": "success",
      "exit_code": 0,
      "duration_seconds": 11.735061459243298,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 307,
      "test_filter": [
        "tests/test_UAT_FC_REQ-31_preview_panel_reset_button.test.ts"
      ],
      "coverage": 83.88,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "hung_test": null,
      "timeout_reason": null,
      "partial_results": false,
      "failures": []
    }
  },
  "overall": {
    "status": "success",
    "issues": []
  },
  "validation": {
    "anomalies": []
  },
  "quality_config_validation": {
    "issues": [
      {
        "severity": "info",
        "category": "scope_empty",
        "field": "suite: javascript-vitest",
        "message": "Suite 'javascript-vitest' ran with an empty scope: 307 tests were collected and all were deselected by the -k filter. No tests to execute.",
        "suggestion": "This is a legitimate skip \u2014 the scope resolves to ACs whose tests don't exist yet (e.g. a refactor running before feature/upgrade work has produced UATs). The workflow should route past quality_check via @skipped.",
        "context": {
          "actual": 0,
          "deselected": 307,
          "test_filter_expression": null
        }
      }
    ]
  }
}