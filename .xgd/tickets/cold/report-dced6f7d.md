---
uid: report-dced6f7d
id: REPORT-41
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-16T01:19:58.002177+00:00'
updated_at: '2026-06-16T01:19:58.002177+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-16T01:19:48.212418Z",
  "lint": {
    "status": "failure",
    "exit_code": 1,
    "duration_seconds": 0.6407645840663463,
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
    "Lint": {
      "suite_name": "Lint",
      "status": "failure",
      "passed": 0,
      "failed": 1,
      "total": 1,
      "failures": [
        {
          "test_name": "lint",
          "k_eligible": false,
          "error_type": "lint",
          "message": "Lint failed with 1 error(s); the runner reported the failure but did not parse individual errors. Run the lint command to see details.",
          "kind": "lint_violation"
        }
      ]
    },
    "javascript-vitest": {
      "suite_name": "javascript-vitest",
      "status": "success",
      "exit_code": 0,
      "duration_seconds": 5.937021249905229,
      "passed": 127,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 127,
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
          "test_name": "lint",
          "k_eligible": false,
          "error_type": "execution_error",
          "message": "Lint failed",
          "suggested_fix": "Fix lint errors",
          "field": "lint",
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
        "field": "lint",
        "message": "Lint failed",
        "suggestion": "Fix lint errors",
        "context": {
          "errors": 0,
          "warnings": 0
        }
      },
      {
        "severity": "error",
        "category": "test_failure",
        "field": "test results",
        "message": "1 test(s) failed",
        "suggestion": "Fix failing tests",
        "context": {
          "failures": 1
        }
      },
      {
        "severity": "error",
        "category": "test_failure",
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