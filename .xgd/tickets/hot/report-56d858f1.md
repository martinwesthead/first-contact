---
uid: report-56d858f1
id: REPORT-632
type: report
title: 'Report: batch_quality_check for report-a5713a64'
created_by: xgd
created_at: '2026-06-27T01:47:24.090858+00:00'
updated_at: '2026-06-27T01:47:24.090858+00:00'
completed_at: null
last_field_updated: created_at
result: pass
fields:
  report_kind: batch_quality_check
  subject_uid: report-a5713a64
  parent_report_uid: report-5fc6b886
  batch_index: 0
  quality_fix_cycle: 0
---

{
  "timestamp": "2026-06-27T01:46:40.219623Z",
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
      "duration_seconds": 17.910808791872114,
      "passed": 3,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 3,
      "deselected": 376,
      "test_filter": [
        "test_UAT_AC486",
        "test_UAT_AC548"
      ],
      "coverage": 87.36,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "stdout": " theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot\",\"status\":\"skipped\",\"title\":\"test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties\",\"status\":\"skipped\",\"title\":\"test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults\",\"status\":\"skipped\",\"title\":\"test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet\",\"status\":\"skipped\",\"title\":\"test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles\",\"status\":\"skipped\",\"title\":\"test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata\",\"status\":\"skipped\",\"title\":\"test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes\",\"status\":\"skipped\",\"title\":\"test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap\",\"status\":\"skipped\",\"title\":\"test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782524801779,\"endTime\":1782524801779,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-3/tests/test_reconciliation_theme_css_and_fonts.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC555_internal_and_ssrf_targets_rejected_with_typed_detail\",\"status\":\"skipped\",\"title\":\"test_UAT_AC555_internal_and_ssrf_targets_rejected_with_typed_detail\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC556_disallowed_schemes_rejected_with_typed_reason\",\"status\":\"skipped\",\"title\":\"test_UAT_AC556_disallowed_schemes_rejected_with_typed_reason\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC557_plain_http_requires_same_origin_approval\",\"status\":\"skipped\",\"title\":\"test_UAT_AC557_plain_http_requires_same_origin_approval\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC558_redirects_revalidate_target_on_every_hop\",\"status\":\"skipped\",\"title\":\"test_UAT_AC558_redirects_revalidate_target_on_every_hop\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC559_redirect_chain_capped_at_five_hops\",\"status\":\"skipped\",\"title\":\"test_UAT_AC559_redirect_chain_capped_at_five_hops\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC560_response_body_capped_at_five_megabytes\",\"status\":\"skipped\",\"title\":\"test_UAT_AC560_response_body_capped_at_five_megabytes\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC561_identical_get_fetches_within_one_hour_return_from_cache\",\"status\":\"skipped\",\"title\":\"test_UAT_AC561_identical_get_fetches_within_one_hour_return_from_cache\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC562_per_account_hourly_fetch_limit_rate_limited_on_overage\",\"status\":\"skipped\",\"title\":\"test_UAT_AC562_per_account_hourly_fetch_limit_rate_limited_on_overage\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC563_per_account_burst_limit_rate_limited_at_eleven_in_sixty_seconds\",\"status\":\"skipped\",\"title\":\"test_UAT_AC563_per_account_burst_limit_rate_limited_at_eleven_in_sixty_seconds\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC564_per_account_daily_fetch_limit_rate_limited_on_overage\",\"status\":\"skipped\",\"title\":\"test_UAT_AC564_per_account_daily_fetch_limit_rate_limited_on_overage\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC565_browser_budget_exhausts_per_chat_session_at_fifty_seconds\",\"status\":\"skipped\",\"title\":\"test_UAT_AC565_browser_budget_exhausts_per_chat_session_at_fifty_seconds\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC566_browser_budget_exhausts_per_account_day_at_two_hundred_seconds\",\"status\":\"skipped\",\"title\":\"test_UAT_AC566_browser_budget_exhausts_per_account_day_at_two_hundred_seconds\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC567_robots_txt_rules_govern_with_longest_match_precedence\",\"status\":\"skipped\",\"title\":\"test_UAT_AC567_robots_txt_rules_govern_with_longest_match_precedence\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC568_per_chat_robots_override_unblocks_origin_without_affecting_other_chats\",\"status\":\"skipped\",\"title\":\"test_UAT_AC568_per_chat_robots_override_unblocks_origin_without_affecting_other_chats\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC569_operator_intent_token_required_for_ai_fetch_tool_call\",\"status\":\"skipped\",\"title\":\"test_UAT_AC569_operator_intent_token_required_for_ai_fetch_tool_call\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC570_operator_intent_token_expires_after_sixty_seconds\",\"status\":\"skipped\",\"title\":\"test_UAT_AC570_operator_intent_token_expires_after_sixty_seconds\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC571_operator_intent_token_bound_to_its_chat_session\",\"status\":\"skipped\",\"title\":\"test_UAT_AC571_operator_intent_token_bound_to_its_chat_session\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC572_operator_messages_with_url_or_fetch_keyword_imply_intent\",\"status\":\"skipped\",\"title\":\"test_UAT_AC572_operator_messages_with_url_or_fetch_keyword_imply_intent\",\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-a0482aed: External fetch safety contract\"],\"fullName\":\"Story story-a0482aed: External fetch safety contract test_UAT_AC573_safety_health_endpoint_returns_calling_accounts_rate_limit_state\",\"status\":\"skipped\",\"title\":\"test_UAT_AC573_safety_health_endpoint_returns_calling_accounts_rate_limit_state\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782524801779,\"endTime\":1782524801779,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-3/tests/test_reconciliation_web_fetch_safety.test.ts\"}]}",
      "stderr": "",
      "tests": [
        {
          "name": "UAT AC-486: POST /api/chat runs the multi-turn Anthropic tool loop, executes tool_use blocks server-side, and returns extracted text and tool calls test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-486: POST /api/chat runs the multi-turn Anthropic tool loop, executes tool_use blocks server-side, and returns extracted text and tool calls test_UAT_AC486_rejected_tool_call_is_flagged_is_error_and_leaves_working_site_unchanged",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-a07c8ed3: Operator action dispatch namespace, plan-tier auth, SSE channel test_UAT_AC548_sse_endpoint_streams_five_event_types_and_closes_cleanly",
          "file": "",
          "status": "passed"
        }
      ],
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