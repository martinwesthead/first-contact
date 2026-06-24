---
uid: report-ffb7953a
id: REPORT-365
type: report
title: 'Report: quality for standalone'
created_by: xgd
created_at: '2026-06-20T23:14:06.927407+00:00'
updated_at: '2026-06-20T23:14:06.927407+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: standalone
---

{
  "timestamp": "2026-06-20T23:13:25.733725Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 6.475020200014114e-05,
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
      "status": "failure",
      "exit_code": 1,
      "duration_seconds": 18.13606858300045,
      "passed": 541,
      "failed": 2,
      "skipped": 0,
      "errors": 0,
      "total": 543,
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
      "failures": [
        {
          "test_name": "UAT FC BUG-5: how-to doc instructs AI to pass AssetRef objects (not strings) the inlined llm-context constant matches the .md file byte-for-byte (drift guard)",
          "message": "(structured failure details unavailable \u2014 JUnit XML missing or unparseable; this entry synthesised from streamed pytest output. Run pytest -k <test_name> to fetch full traceback.)",
          "file_path": "",
          "line_number": null,
          "error_type": "assertion",
          "action_required": null,
          "traceback": null,
          "synthesised": true
        },
        {
          "test_name": "UAT FC REQ-30: chat system prompt includes the how-to doc (AC6) the inlined constant matches the canonical .md file byte-for-byte (drift guard)",
          "message": "(structured failure details unavailable \u2014 JUnit XML missing or unparseable; this entry synthesised from streamed pytest output. Run pytest -k <test_name> to fetch full traceback.)",
          "file_path": "",
          "line_number": null,
          "error_type": "assertion",
          "action_required": null,
          "traceback": null,
          "synthesised": true
        }
      ]
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
        "severity": "error",
        "category": "test_failure",
        "field": "test results",
        "message": "2 test(s) failed",
        "suggestion": "Fix failing tests",
        "context": {
          "failures": 2
        }
      }
    ]
  }
}