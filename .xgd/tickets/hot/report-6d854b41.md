---
uid: report-6d854b41
id: REPORT-526
type: report
title: 'Report: batch_quality_check for report-57a8f0a6'
created_by: xgd
created_at: '2026-06-25T02:24:26.221551+00:00'
updated_at: '2026-06-25T02:24:26.221551+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: batch_quality_check
  subject_uid: report-57a8f0a6
  parent_report_uid: report-b2dbf48b
  batch_index: 0
  quality_fix_cycle: 0
---

{
  "timestamp": "2026-06-25T02:23:56.758297Z",
  "lint": null,
  "build": null,
  "preflight": {
    "status": "pass",
    "violations": []
  },
  "suites": {
    "javascript-vitest": {
      "suite_name": "javascript-vitest",
      "status": "success",
      "exit_code": 0,
      "duration_seconds": 11.03838620800525,
      "passed": 0,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 0,
      "deselected": 231,
      "test_filter": [
        "project.min_coverage"
      ],
      "coverage": 80.84,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "stdout": "n persists across reloads via localStorage warns but still persists when the serialised site exceeds the configured size threshold\",\"status\":\"skipped\",\"title\":\"warns but still persists when the serialised site exceeds the configured size threshold\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782354237663,\"endTime\":1782354237663,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_UAT_FC_REQ-8_state_persisted_to_localstorage.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"UAT FC REQ-8: a stubbed tool call updates the store and re-renders the preview iframe\"],\"fullName\":\"UAT FC REQ-8: a stubbed tool call updates the store and re-renders the preview iframe applies set_theme_token through the validator, updates the store, and the new token value appears in the iframe's CSS\",\"status\":\"skipped\",\"title\":\"applies set_theme_token through the validator, updates the store, and the new token value appears in the iframe's CSS\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782354237663,\"endTime\":1782354237663,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_UAT_FC_REQ-8_tool_call_applies_to_preview.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"UAT FC REQ-8: viewport switch resizes the preview iframe\"],\"fullName\":\"UAT FC REQ-8: viewport switch resizes the preview iframe starts at desktop, then mobile / tablet presets resize the iframe to 375/768/100%\",\"status\":\"skipped\",\"title\":\"starts at desktop, then mobile / tablet presets resize the iframe to 375/768/100%\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782354237663,\"endTime\":1782354237663,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_UAT_FC_REQ-8_viewport_switch.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC443_cli_accepts_site_out_clean_flags\",\"status\":\"skipped\",\"title\":\"test_UAT_AC443_cli_accepts_site_out_clean_flags\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC444_runGenerate_returns_result_describing_outputs\",\"status\":\"skipped\",\"title\":\"test_UAT_AC444_runGenerate_returns_result_describing_outputs\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc\",\"status\":\"skipped\",\"title\":\"test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker\",\"status\":\"skipped\",\"title\":\"test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles\",\"status\":\"skipped\",\"title\":\"test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC448_every_page_links_to_assets_theme_css\",\"status\":\"skipped\",\"title\":\"test_UAT_AC448_every_page_links_to_assets_theme_css\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC449_head_emits_viewport_title_description_og_metadata\",\"status\":\"skipped\",\"title\":\"test_UAT_AC449_head_emits_viewport_title_description_og_metadata\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves\",\"status\":\"skipped\",\"title\":\"test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC451_assets_copied_preserving_relative_paths\",\"status\":\"skipped\",\"title\":\"test_UAT_AC451_assets_copied_preserving_relative_paths\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers\",\"status\":\"skipped\",\"title\":\"test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror\",\"status\":\"skipped\",\"title\":\"test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC454_clean_flag_wipes_output_directory\",\"status\":\"skipped\",\"title\":\"test_UAT_AC454_clean_flag_wipes_output_directory\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure\",\"status\":\"skipped\",\"title\":\"test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782354237663,\"endTime\":1782354237663,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_reconciliation_static_site_generator.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot\",\"status\":\"skipped\",\"title\":\"test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties\",\"status\":\"skipped\",\"title\":\"test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults\",\"status\":\"skipped\",\"title\":\"test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet\",\"status\":\"skipped\",\"title\":\"test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles\",\"status\":\"skipped\",\"title\":\"test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata\",\"status\":\"skipped\",\"title\":\"test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes\",\"status\":\"skipped\",\"title\":\"test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap\",\"status\":\"skipped\",\"title\":\"test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782354237663,\"endTime\":1782354237663,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_reconciliation_theme_css_and_fonts.test.ts\"}]}",
      "stderr": "",
      "tests": [],
      "hung_test": null,
      "timeout_reason": null,
      "partial_results": false,
      "failures": []
    }
  },
  "overall": {
    "status": "success",
    "issues": []
  },
  "validation": {
    "anomalies": []
  },
  "blast_radius": {
    "test_scope": "",
    "files": []
  }
}