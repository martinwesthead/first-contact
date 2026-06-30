---
uid: report-0b531ad1
id: REPORT-892
type: report
title: 'Regression quality: pass (0 tests, 0 failed)'
created_by: xgd
created_at: '2026-06-30T05:44:56.907858+00:00'
updated_at: '2026-06-30T05:44:56.907858+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: quality
  subject_uid: report-90a0082d
  commit: 60cb17ac45026ca21b6ebc899c96ed382e258d18
---

{
  "timestamp": "2026-06-30T05:44:50.628589Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 0.00010412512347102165,
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
      "duration_seconds": 1.0532502080313861,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 0,
      "test_filter": [
        "test_UAT_AC384",
        "test_UAT_AC385",
        "test_UAT_AC386",
        "test_UAT_AC387",
        "test_UAT_AC388",
        "test_UAT_AC389",
        "test_UAT_AC390",
        "test_UAT_AC477",
        "test_UAT_AC478",
        "test_UAT_AC479",
        "test_UAT_AC480",
        "test_UAT_AC481",
        "test_UAT_AC482",
        "test_UAT_AC483",
        "test_UAT_AC484",
        "test_UAT_AC485",
        "test_UAT_AC486",
        "test_UAT_AC487",
        "test_UAT_AC553",
        "test_UAT_AC554",
        "test_UAT_AC580",
        "test_UAT_AC581",
        "test_UAT_AC582",
        "test_UAT_AC583",
        "test_UAT_AC584",
        "test_UAT_AC585",
        "test_UAT_AC586",
        "test_UAT_AC671",
        "test_UAT_AC672",
        "test_UAT_AC673",
        "test_UAT_AC674",
        "test_UAT_AC675",
        "test_UAT_AC676",
        "test_UAT_AC677",
        "test_UAT_AC678",
        "test_UAT_AC679",
        "test_UAT_AC680",
        "test_UAT_AC681",
        "test_UAT_AC682",
        "test_UAT_AC683",
        "test_UAT_AC730",
        "test_UAT_AC731",
        "test_UAT_AC732",
        "test_UAT_AC733",
        "test_UAT_AC734",
        "test_UAT_AC735",
        "test_UAT_AC793",
        "test_UAT_AC794",
        "test_UAT_AC795",
        "test_UAT_AC796",
        "test_UAT_AC797",
        "test_UAT_AC798",
        "test_UAT_AC799",
        "test_UAT_AC800",
        "test_UAT_AC801",
        "test_UAT_AC802",
        "test_UAT_AC803",
        "test_UAT_AC804",
        "test_UAT_AC805",
        "test_UAT_AC806",
        "test_UAT_AC807",
        "test_UAT_AC808",
        "test_UAT_AC809",
        "test_UAT_AC810",
        "test_UAT_AC811",
        "test_UAT_AC812",
        "test_UAT_AC813",
        "test_UAT_AC814",
        "test_UAT_AC815",
        "test_UAT_AC816",
        "test_UAT_AC817",
        "test_UAT_AC818",
        "test_UAT_AC819",
        "test_UAT_AC820",
        "test_UAT_AC821",
        "test_UAT_FC_BUG_8",
        "test_UAT_FC_BUNDLE_9",
        "test_UAT_FC_REQ_23",
        "test_UAT_FC_REQ_24",
        "test_UAT_FC_REQ_25",
        "test_UAT_FC_REQ_50"
      ],
      "coverage": null,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "stdout": "22:44:51 [WARN] Missing pages directory: src/pages\n\n RUN  v2.1.9 /Users/martin/.xgd/worktrees/git_github.com_martinwesthead_first-contact.git/reconcile-BUNDLE-9\n\nfilter:  ai.gendevlabs.swift_xctest_open\ninclude: tests/**/*.test.ts\nexclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cache,output,temp}/**, **/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*\n\nNo test files found, exiting with code 1\n",
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