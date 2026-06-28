---
uid: report-008ccafa
id: REPORT-533
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-25T18:07:08.027891+00:00'
updated_at: '2026-06-25T18:07:08.027891+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-25T18:07:02.296463Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 7.954193279147148e-05,
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
      "exit_code": 1,
      "duration_seconds": 0.7477543749846518,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 0,
      "test_filter": [
        "BUG-17",
        "REQ-20",
        "REQ-22",
        "REQ-51"
      ],
      "coverage": null,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "hung_test": null,
      "timeout_reason": null,
      "partial_results": false,
      "no_test_files": true,
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