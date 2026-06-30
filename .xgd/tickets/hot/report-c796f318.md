---
uid: report-c796f318
id: REPORT-919
type: report
title: 'Regression quality: pass (0 tests, 0 failed)'
created_by: xgd
created_at: '2026-06-30T07:05:34.707012+00:00'
updated_at: '2026-06-30T07:05:34.707012+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: report-bddf1ae3
  commit: 0031279af06b7e6f15b70148b80a1ca78f00554e
---

{
  "timestamp": "2026-06-30T07:05:27.321672Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.00013524992391467094,
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
      "duration_seconds": 1.02808295795694,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 0,
      "test_filter": [
        "test_UAT_AC555",
        "test_UAT_AC556",
        "test_UAT_AC557",
        "test_UAT_AC558",
        "test_UAT_AC559",
        "test_UAT_AC560",
        "test_UAT_AC561",
        "test_UAT_AC562",
        "test_UAT_AC563",
        "test_UAT_AC564",
        "test_UAT_AC565",
        "test_UAT_AC566",
        "test_UAT_AC567",
        "test_UAT_AC568",
        "test_UAT_AC569",
        "test_UAT_AC570",
        "test_UAT_AC571",
        "test_UAT_AC572",
        "test_UAT_AC573",
        "test_UAT_AC587",
        "test_UAT_AC588",
        "test_UAT_AC589",
        "test_UAT_AC590",
        "test_UAT_AC591",
        "test_UAT_AC592",
        "test_UAT_AC593",
        "test_UAT_AC594",
        "test_UAT_AC595",
        "test_UAT_AC596",
        "test_UAT_AC598",
        "test_UAT_AC599",
        "test_UAT_AC600",
        "test_UAT_AC601",
        "test_UAT_AC602",
        "test_UAT_AC603",
        "test_UAT_AC604",
        "test_UAT_AC605",
        "test_UAT_AC606",
        "test_UAT_AC607",
        "test_UAT_AC608",
        "test_UAT_AC609",
        "test_UAT_AC612",
        "test_UAT_AC613",
        "test_UAT_AC614",
        "test_UAT_AC617",
        "test_UAT_AC618",
        "test_UAT_AC620",
        "test_UAT_AC621",
        "test_UAT_AC622",
        "test_UAT_AC727",
        "test_UAT_AC788",
        "test_UAT_AC789",
        "test_UAT_AC790",
        "test_UAT_AC822",
        "test_UAT_AC823",
        "test_UAT_AC824",
        "test_UAT_AC825",
        "test_UAT_AC826",
        "test_UAT_AC827",
        "test_UAT_AC828",
        "test_UAT_AC829",
        "test_UAT_AC830",
        "test_UAT_AC831",
        "test_UAT_AC832",
        "test_UAT_AC833",
        "test_UAT_AC834",
        "test_UAT_AC835",
        "test_UAT_AC836",
        "test_UAT_AC837",
        "test_UAT_AC838",
        "test_UAT_AC839",
        "test_UAT_FC_BUG_15",
        "test_UAT_FC_BUG_17",
        "test_UAT_FC_BUNDLE_10",
        "test_UAT_FC_REQ_51",
        "test_UAT_FC_REQ_53"
      ],
      "coverage": null,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "stdout": "00:05:28 [WARN] Missing pages directory: src/pages\n\n RUN  v2.1.9 /Users/martin/.xgd/worktrees/git_github.com_martinwesthead_first-contact.git/reconcile-BUNDLE-10\n\nfilter:  ai.gendevlabs.swift_xctest_open\ninclude: tests/**/*.test.ts\nexclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cache,output,temp}/**, **/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*\n\nNo test files found, exiting with code 1\n",
      "stderr": "",
      "tests": [],
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