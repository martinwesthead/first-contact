---
uid: report-f639fa45
id: REPORT-320
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-18T23:03:14.849806+00:00'
updated_at: '2026-06-18T23:03:14.849806+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-18T23:02:58.261004Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 7.029203698039055e-05,
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
      "duration_seconds": 6.272176958620548,
      "passed": 29,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 29,
      "deselected": 136,
      "test_filter": [
        "REQ-20"
      ],
      "coverage": 79.51,
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