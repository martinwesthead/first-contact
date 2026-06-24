---
uid: report-f8b91935
id: REPORT-318
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-18T23:02:00.157750+00:00'
updated_at: '2026-06-18T23:02:00.157750+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-18T23:01:57.743868Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 5.825003609061241e-05,
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
      "duration_seconds": 5.91278076171875e-05,
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
      ]
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