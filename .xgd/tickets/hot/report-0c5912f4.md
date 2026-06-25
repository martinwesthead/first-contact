---
uid: report-0c5912f4
id: REPORT-513
type: report
title: 'Regression quality: fail (2 tests, 2 failed)'
created_by: xgd
created_at: '2026-06-25T02:09:26.124575+00:00'
updated_at: '2026-06-25T02:09:26.124575+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: report-57a8f0a6
  commit: f459b540623ed58a5e7aa88d8f15fed4a322a8ba
---

{
  "timestamp": "2026-06-25T02:09:23.570526Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.00011520832777023315,
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
      "status": "error",
      "exit_code": -1,
      "duration_seconds": 7.200241088867188e-05,
      "error": "Plugin error: Suite 'javascript-vitest' config errors: Unknown field: per_test_timeout",
      "failures": [
        {
          "test_name": "javascript-vitest: plugin_error",
          "error_type": "plugin_error",
          "message": "Plugin error: Suite 'javascript-vitest' config errors: Unknown field: per_test_timeout",
          "suggested_fix": "Plugin not available for this suite \u2014 check quality.yaml test_suites entries against the registered plugins.",
          "suite": "javascript-vitest",
          "kind": "suite_error"
        }
      ],
      "failed": 1,
      "total": 1
    },
    "Quality Config": {
      "suite_name": "Quality Config",
      "status": "failure",
      "passed": 0,
      "failed": 1,
      "total": 1,
      "failures": [
        {
          "test_name": "suite: javascript-vitest",
          "k_eligible": false,
          "error_type": "infrastructure_bug",
          "message": "INFRASTRUCTURE BUG: Suite 'javascript-vitest' executed 0 tests. Test suite failed to run.",
          "suggested_fix": "Test suite did not execute. Check: (1) Test command in quality.yaml, (2) Build errors, (3) Test target configuration, (4) For Swift: xcodebuild output. Claude cannot fix infrastructure bugs.",
          "field": "suite: javascript-vitest",
          "kind": "quality_config_violation"
        }
      ],
      "tests": []
    }
  },
  "overall": {
    "status": "error",
    "issues": []
  },
  "validation": {
    "anomalies": []
  },
  "quality_config_validation": {
    "issues": [
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