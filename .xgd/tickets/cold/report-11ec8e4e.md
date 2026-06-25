---
uid: report-11ec8e4e
id: REPORT-368
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-22T19:53:53.156837+00:00'
updated_at: '2026-06-22T19:53:53.156837+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-22T19:52:58.238871Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.00012179231271147728,
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
      "duration_seconds": 24.17212558304891,
      "passed": 669,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 669,
      "deselected": 0,
      "test_filter": null,
      "coverage": 85.12,
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
  }
}