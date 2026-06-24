---
uid: report-5745cbb9
id: REPORT-367
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-21T18:32:41.895432+00:00'
updated_at: '2026-06-21T18:32:41.895432+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-21T18:31:59.086975Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 7.520755752921104e-05,
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
      "duration_seconds": 17.95021270774305,
      "passed": 5,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 5,
      "deselected": 635,
      "test_filter": [
        "REQ-49"
      ],
      "coverage": 84.92,
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