---
uid: report-e34a810a
id: REPORT-360
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-20T22:59:38.502286+00:00'
updated_at: '2026-06-20T22:59:38.502286+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-20T22:58:55.524053Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 7.537519559264183e-05,
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
      "duration_seconds": 17.786098207812756,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 518,
      "test_filter": [
        "tests/test_UAT_FC_REQ-39_*.test.ts"
      ],
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
      },
      {
        "severity": "info",
        "category": "scope_empty",
        "field": "suite: javascript-vitest",
        "message": "Suite 'javascript-vitest' ran with an empty scope: 518 tests were collected and all were deselected by the -k filter. No tests to execute.",
        "suggestion": "This is a legitimate skip \u2014 the scope resolves to ACs whose tests don't exist yet (e.g. a refactor running before feature/upgrade work has produced UATs). The workflow should route past quality_check via @skipped.",
        "context": {
          "actual": 0,
          "deselected": 518,
          "test_filter_expression": null
        }
      }
    ]
  }
}