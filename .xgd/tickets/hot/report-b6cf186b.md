---
uid: report-b6cf186b
id: REPORT-630
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-27T01:45:48.624787+00:00'
updated_at: '2026-06-27T01:45:48.624787+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-27T01:45:46.284912Z",
  "lint": null,
  "build": null,
  "preflight": {
    "status": "pass",
    "violations": []
  },
  "suites": {
    "javascript-vitest": {
      "suite_name": "javascript-vitest",
      "status": "error",
      "exit_code": -1,
      "duration_seconds": 0.01041412353515625,
      "error": "Plugin error: No plugin found for plugin_name='ai.gendevlabs.javascript_vitest_open'. Available: ai.gendevlabs.python-core, ai.gendevlabs.rust-core, ai.gendevlabs.swift-core",
      "failures": [
        {
          "test_name": "javascript-vitest: plugin_error",
          "error_type": "plugin_error",
          "message": "Plugin error: No plugin found for plugin_name='ai.gendevlabs.javascript_vitest_open'. Available: ai.gendevlabs.python-core, ai.gendevlabs.rust-core, ai.gendevlabs.swift-core",
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