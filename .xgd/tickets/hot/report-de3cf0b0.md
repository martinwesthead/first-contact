---
uid: report-de3cf0b0
id: REPORT-369
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-22T20:26:36.732095+00:00'
updated_at: '2026-06-22T20:26:36.732095+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-22T20:26:08.789370Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 7.179193198680878e-05,
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
      "duration_seconds": 0.2984682498499751,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 0,
      "test_filter": [
        "test_UAT_FC_REQ-25",
        "test_UAT_FC_REQ-37",
        "test_UAT_FC_REQ-34",
        "test_UAT_FC_REQ-8",
        "test_UAT_FC_REQ-36",
        "test_UAT_FC_REQ-32",
        "test_UAT_FC_REQ-13",
        "test_UAT_FC_REQ-24"
      ],
      "coverage": 84.83,
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
      "failed": 2,
      "total": 2,
      "failures": [
        {
          "test_name": "test results",
          "k_eligible": false,
          "error_type": "execution_error",
          "message": "0 tests ran but coverage is 84.8% (stale coverage files)",
          "suggested_fix": "Delete coverage files (.coverage, *.profdata) and re-run tests",
          "field": "test results",
          "kind": "quality_config_violation"
        },
        {
          "test_name": "suite: javascript-vitest",
          "k_eligible": false,
          "error_type": "infrastructure_bug",
          "message": "INFRASTRUCTURE BUG: Suite 'javascript-vitest' executed 0 tests. Test suite failed to run.",
          "suggested_fix": "Test suite did not execute. Check: (1) Test command in quality.yaml, (2) Build errors, (3) Test target configuration, (4) For Swift: xcodebuild output. Claude cannot fix infrastructure bugs.",
          "field": "suite: javascript-vitest",
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
        "category": "execution_error",
        "field": "test results",
        "message": "0 tests ran but coverage is 84.8% (stale coverage files)",
        "suggestion": "Delete coverage files (.coverage, *.profdata) and re-run tests",
        "context": {
          "coverage": 84.83,
          "tests_run": 0
        }
      },
      {
        "severity": "error",
        "category": "infrastructure_bug",
        "field": "suite: javascript-vitest",
        "message": "INFRASTRUCTURE BUG: Suite 'javascript-vitest' executed 0 tests. Test suite failed to run.",
        "suggestion": "Test suite did not execute. Check: (1) Test command in quality.yaml, (2) Build errors, (3) Test target configuration, (4) For Swift: xcodebuild output. Claude cannot fix infrastructure bugs.",
        "context": {
          "actual": 0
        }
      }
    ]
  }
}