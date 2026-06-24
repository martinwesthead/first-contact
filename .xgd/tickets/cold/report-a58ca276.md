---
uid: report-a58ca276
id: REPORT-289
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-17T22:46:17.714546+00:00'
updated_at: '2026-06-17T22:46:17.714546+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-17T22:46:06.780673Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.0006634998135268688,
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
      "duration_seconds": 7.285056916065514,
      "passed": 136,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 136,
      "deselected": 0,
      "test_filter": null,
      "coverage": 0.0,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "hung_test": null,
      "timeout_reason": null,
      "partial_results": false,
      "failures": []
    },
    "Quality Config": {
      "suite_name": "Quality Config",
      "status": "failure",
      "passed": 0,
      "failed": 1,
      "total": 1,
      "failures": [
        {
          "test_name": "project.min_coverage",
          "k_eligible": false,
          "error_type": "config_error",
          "message": "Coverage 0.0% below minimum 25.0%",
          "suggested_fix": "Add tests to increase coverage",
          "field": "project.min_coverage",
          "kind": "quality_config_violation"
        }
      ]
    }
  },
  "overall": {
    "status": "failure",
    "issues": []
  },
  "validation": {
    "anomalies": []
  },
  "quality_config_validation": {
    "issues": [
      {
        "severity": "error",
        "category": "config_error",
        "field": "project.min_coverage",
        "message": "Coverage 0.0% below minimum 25.0%",
        "suggestion": "Add tests to increase coverage",
        "context": {
          "actual": 0.0,
          "minimum": 25.0
        }
      }
    ]
  }
}