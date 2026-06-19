---
uid: report-62916ac4
id: REPORT-335
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-19T00:47:40.234185+00:00'
updated_at: '2026-06-19T00:47:40.234185+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-19T00:47:16.259650Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.00034916726872324944,
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
      "duration_seconds": 10.206392999738455,
      "passed": 210,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 210,
      "deselected": 0,
      "test_filter": null,
      "coverage": 82.71,
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