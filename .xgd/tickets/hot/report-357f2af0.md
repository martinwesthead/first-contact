---
uid: report-357f2af0
id: REPORT-350
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-19T00:59:36.089803+00:00'
updated_at: '2026-06-19T00:59:36.089803+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-19T00:59:13.829274Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 6.391573697328568e-05,
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
      "duration_seconds": 9.037664541043341,
      "passed": 226,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 226,
      "deselected": 0,
      "test_filter": null,
      "coverage": 81.7,
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