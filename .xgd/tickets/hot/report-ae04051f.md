---
uid: report-ae04051f
id: REPORT-522
type: report
title: 'Regression quality: fail (105 tests, 1 failed)'
created_by: xgd
created_at: '2026-06-25T02:13:35.155690+00:00'
updated_at: '2026-06-25T02:13:35.155690+00:00'
completed_at: null
last_field_updated: created_at
result: fail
fields:
  report_kind: quality
  subject_uid: report-57a8f0a6
  commit: 32bfb11f7d39ab48fba940ac0e933cbd2dc1066f
---

{
  "timestamp": "2026-06-25T02:13:18.600517Z",
  "lint": {
    "status": "success",
    "exit_code": 0,
    "duration_seconds": 8.391682058572769e-05,
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
      "exit_code": 0,
      "duration_seconds": 12.77909224992618,
      "passed": 104,
      "failed": 0,
      "skipped": 0,
      "errors": 0,
      "total": 104,
      "deselected": 127,
      "test_filter": [
        "test_UAT_AC384",
        "test_UAT_AC385",
        "test_UAT_AC386",
        "test_UAT_AC387",
        "test_UAT_AC388",
        "test_UAT_AC389",
        "test_UAT_AC390",
        "test_UAT_AC391",
        "test_UAT_AC392",
        "test_UAT_AC393",
        "test_UAT_AC394",
        "test_UAT_AC395",
        "test_UAT_AC396",
        "test_UAT_AC397",
        "test_UAT_AC398",
        "test_UAT_AC399",
        "test_UAT_AC400",
        "test_UAT_AC401",
        "test_UAT_AC402",
        "test_UAT_AC403",
        "test_UAT_AC404",
        "test_UAT_AC405",
        "test_UAT_AC406",
        "test_UAT_AC407",
        "test_UAT_AC408",
        "test_UAT_AC409",
        "test_UAT_AC410",
        "test_UAT_AC411",
        "test_UAT_AC412",
        "test_UAT_AC413",
        "test_UAT_AC414",
        "test_UAT_AC415",
        "test_UAT_AC416",
        "test_UAT_AC417",
        "test_UAT_AC418",
        "test_UAT_AC419",
        "test_UAT_AC420",
        "test_UAT_AC421",
        "test_UAT_AC422",
        "test_UAT_AC423",
        "test_UAT_AC424",
        "test_UAT_AC425",
        "test_UAT_AC426",
        "test_UAT_AC427",
        "test_UAT_AC428",
        "test_UAT_AC429",
        "test_UAT_AC430",
        "test_UAT_AC431",
        "test_UAT_AC432",
        "test_UAT_AC433",
        "test_UAT_AC434",
        "test_UAT_AC435",
        "test_UAT_AC436",
        "test_UAT_AC437",
        "test_UAT_AC438",
        "test_UAT_AC439",
        "test_UAT_AC440",
        "test_UAT_AC441",
        "test_UAT_AC442",
        "test_UAT_AC443",
        "test_UAT_AC444",
        "test_UAT_AC445",
        "test_UAT_AC446",
        "test_UAT_AC447",
        "test_UAT_AC448",
        "test_UAT_AC449",
        "test_UAT_AC450",
        "test_UAT_AC451",
        "test_UAT_AC452",
        "test_UAT_AC453",
        "test_UAT_AC454",
        "test_UAT_AC455",
        "test_UAT_AC456",
        "test_UAT_AC457",
        "test_UAT_AC458",
        "test_UAT_AC459",
        "test_UAT_AC460",
        "test_UAT_AC461",
        "test_UAT_AC462",
        "test_UAT_AC463",
        "test_UAT_AC464",
        "test_UAT_AC465",
        "test_UAT_AC466",
        "test_UAT_AC467",
        "test_UAT_AC468",
        "test_UAT_AC469",
        "test_UAT_AC470",
        "test_UAT_AC471",
        "test_UAT_AC472",
        "test_UAT_AC473",
        "test_UAT_AC474",
        "test_UAT_AC475",
        "test_UAT_AC476",
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
        "test_UAT_FC_BUNDLE_2",
        "test_UAT_FC_REQ_1",
        "test_UAT_FC_REQ_2",
        "test_UAT_FC_REQ_3",
        "test_UAT_FC_REQ_4",
        "test_UAT_FC_REQ_5",
        "test_UAT_FC_REQ_6",
        "test_UAT_FC_REQ_7",
        "test_UAT_FC_REQ_8"
      ],
      "coverage": 0.0,
      "lines_covered": 0,
      "lines_total": 0,
      "files_covered": [],
      "junit_xml_path": null,
      "stdout": "store and re-renders the preview iframe\"],\"fullName\":\"UAT FC REQ-8: a stubbed tool call updates the store and re-renders the preview iframe applies set_theme_token through the validator, updates the store, and the new token value appears in the iframe's CSS\",\"status\":\"skipped\",\"title\":\"applies set_theme_token through the validator, updates the store, and the new token value appears in the iframe's CSS\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782353599380,\"endTime\":1782353599380,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_UAT_FC_REQ-8_tool_call_applies_to_preview.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"UAT FC REQ-8: viewport switch resizes the preview iframe\"],\"fullName\":\"UAT FC REQ-8: viewport switch resizes the preview iframe starts at desktop, then mobile / tablet presets resize the iframe to 375/768/100%\",\"status\":\"skipped\",\"title\":\"starts at desktop, then mobile / tablet presets resize the iframe to 375/768/100%\",\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782353599380,\"endTime\":1782353599380,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_UAT_FC_REQ-8_viewport_switch.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC443_cli_accepts_site_out_clean_flags\",\"status\":\"passed\",\"title\":\"test_UAT_AC443_cli_accepts_site_out_clean_flags\",\"duration\":6941.217291999999,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC444_runGenerate_returns_result_describing_outputs\",\"status\":\"passed\",\"title\":\"test_UAT_AC444_runGenerate_returns_result_describing_outputs\",\"duration\":22.7690419999999,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc\",\"status\":\"passed\",\"title\":\"test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc\",\"duration\":6.661833000000115,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker\",\"status\":\"passed\",\"title\":\"test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker\",\"duration\":4.174291999999696,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles\",\"status\":\"passed\",\"title\":\"test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles\",\"duration\":12.431666999998924,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC448_every_page_links_to_assets_theme_css\",\"status\":\"passed\",\"title\":\"test_UAT_AC448_every_page_links_to_assets_theme_css\",\"duration\":12.258165999999619,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC449_head_emits_viewport_title_description_og_metadata\",\"status\":\"passed\",\"title\":\"test_UAT_AC449_head_emits_viewport_title_description_og_metadata\",\"duration\":5.6510419999995065,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves\",\"status\":\"passed\",\"title\":\"test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves\",\"duration\":19.02062500000102,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC451_assets_copied_preserving_relative_paths\",\"status\":\"passed\",\"title\":\"test_UAT_AC451_assets_copied_preserving_relative_paths\",\"duration\":13.578833999999915,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers\",\"status\":\"passed\",\"title\":\"test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers\",\"duration\":1.8155829999996058,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror\",\"status\":\"passed\",\"title\":\"test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror\",\"duration\":5.592957999999271,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC454_clean_flag_wipes_output_directory\",\"status\":\"passed\",\"title\":\"test_UAT_AC454_clean_flag_wipes_output_directory\",\"duration\":16.924333000000843,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-d111f966: static site generator (reconciliation)\"],\"fullName\":\"Story story-d111f966: static site generator (reconciliation) test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure\",\"status\":\"passed\",\"title\":\"test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure\",\"duration\":2007.3901670000014,\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782353600730,\"endTime\":1782353609800.3901,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_reconciliation_static_site_generator.test.ts\"},{\"assertionResults\":[{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot\",\"status\":\"passed\",\"title\":\"test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot\",\"duration\":1.3164589999998952,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties\",\"status\":\"passed\",\"title\":\"test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties\",\"duration\":0.13666599999999107,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults\",\"status\":\"passed\",\"title\":\"test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults\",\"duration\":0.15870800000004692,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet\",\"status\":\"passed\",\"title\":\"test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet\",\"duration\":0.26120800000001054,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles\",\"status\":\"passed\",\"title\":\"test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles\",\"duration\":0.47833299999990686,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata\",\"status\":\"passed\",\"title\":\"test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata\",\"duration\":1.1486250000000382,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes\",\"status\":\"passed\",\"title\":\"test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes\",\"duration\":0.21349999999995362,\"failureMessages\":[],\"meta\":{}},{\"ancestorTitles\":[\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts\"],\"fullName\":\"Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap\",\"status\":\"passed\",\"title\":\"test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap\",\"duration\":0.2263750000000755,\"failureMessages\":[],\"meta\":{}}],\"startTime\":1782353600216,\"endTime\":1782353600220.2263,\"status\":\"passed\",\"message\":\"\",\"name\":\"/Users/martin/.xgd/worktrees/https___github.com_gendevlabs_1stcontact.git/reconcile-BUNDLE-2/tests/test_reconciliation_theme_css_and_fonts.test.ts\"}]}",
      "stderr": "",
      "tests": [
        {
          "name": "UAT AC-384: control-app Worker serves placeholder at root test_UAT_AC384_control_app_returns_placeholder_at_root",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-385: CI workflow triggers on PRs and runs install/build/test/dry-runs in order test_UAT_AC385_ci_pr_triggers_and_step_order",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-386: deploy workflow triggers on xgd-stable and deploys both Workers test_UAT_AC386_deploy_triggers_and_step_order",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-387: deploy workflow serializes concurrent runs per ref test_UAT_AC387_deploy_concurrency_group_keyed_on_ref",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-388: deploy workflow injects Cloudflare credentials (and CI does not) test_UAT_AC388_deploy_env_sources_secrets_and_ci_does_not",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-389: every identifier uses the 1stcontact slug, no first-contact remains test_UAT_AC389_identifiers_aligned_to_1stcontact_slug",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-390: toolchain pinned to Node 20+ and pnpm 9+, lockfile committed, workflows use --frozen-lockfile test_UAT_AC390_toolchain_pinned_with_frozen_lockfile",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-391: valid minimal site validates and narrows to typed Site test_UAT_AC391_valid_minimal_site_narrows_to_typed_site",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-392: valid full site exercising every slot validates test_UAT_AC392_valid_full_site_validates",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-393: module instance missing required field rejected with JSON-pointer path test_UAT_AC393_module_instance_missing_required_field_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-394: nav pattern outside enum rejected test_UAT_AC394_nav_pattern_outside_enum_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-395: missing required theme-token slot rejected with JSON-pointer path test_UAT_AC395_missing_theme_token_slot_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-396: non-hex value in palette slot rejected test_UAT_AC396_non_hex_palette_value_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-397: catalog membership is NOT validated (framework's concern) test_UAT_AC397_catalog_membership_not_validated",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-398: validator returns ValidationError list with JSON-pointer paths on failure test_UAT_AC398_validator_returns_validation_errors_with_json_pointer_paths",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-399: theme tokens schema enforces the locked superset test_UAT_AC399_theme_tokens_enforces_locked_superset",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-400: ContentValue admits primitives, AssetRef, arrays, and plain objects test_UAT_AC400_content_value_admits_all_shapes",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-401: duplicate module IDs within a page are rejected test_UAT_AC401_duplicate_module_ids_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-402: duplicate page slugs within a site are rejected test_UAT_AC402_duplicate_page_slugs_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-411: registry resolves a known module to its component and meta test_UAT_AC411_registry_resolves_known_module",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-412: registry surfaces a catalog-miss error for an unknown module id test_UAT_AC412_registry_catalog_miss_for_unknown_id",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-413: registry surfaces a catalog-miss error for an unknown version of a known module test_UAT_AC413_registry_catalog_miss_for_unknown_version",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-414: registry exposes the full list of registered modules test_UAT_AC414_registry_exposes_full_list_of_modules",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-415: every chrome module exposes meta conforming to the module contract test_UAT_AC415_every_chrome_module_meta_conforms_to_contract",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-416: header top-nav variant renders the logo and one anchor per navigation entry test_UAT_AC416_header_top_nav_renders_logo_and_entries",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-417: header collapses to a hamburger control below the md breakpoint test_UAT_AC417_header_collapses_below_md_breakpoint",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-418: hero bg-color variant renders without a background image element test_UAT_AC418_hero_bg_color_variant_renders_without_image",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-419: hero bg-image variant renders the background image with the supplied src and alt test_UAT_AC419_hero_bg_image_variant_renders_background_image",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-420: hero omits the CTA when no CTA content is provided test_UAT_AC420_hero_omits_cta_when_not_provided",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-421: footer renders the copyright with the supplied year and holder without computing the year at render time test_UAT_AC421_footer_renders_copyright_with_supplied_year",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-422: footer renders the optional small-link row when navigation entries are supplied test_UAT_AC422_footer_renders_optional_links",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-423: every chrome module's scoped styling references theme custom properties exclusively test_UAT_AC423_chrome_module_scoped_css_uses_theme_custom_properties",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-424: browser-safe meta subpath exports every module meta without depending on server-only modules test_UAT_AC424_browser_safe_meta_subpath_exports_metas_without_server_deps",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-425: text-block prose variant constrains body width to the narrow container test_UAT_AC425_text_block_prose_variant_uses_narrow_container",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-426: text-block landing variant uses the default container width test_UAT_AC426_text_block_landing_variant_uses_default_container",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-427: text-block renders markdown body with headings, lists, links, images, blockquotes, and code test_UAT_AC427_text_block_renders_markdown_body_content",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-428: text-block omits the heading element when no heading is provided test_UAT_AC428_text_block_omits_heading_when_absent",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-429: services-grid three-col variant renders three columns at md+ test_UAT_AC429_services_grid_three_col_at_md_breakpoint",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-430: services-grid two-col variant renders two columns at md+ test_UAT_AC430_services_grid_two_col_at_md_breakpoint",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-431: services-grid collapses to a single column below md breakpoint test_UAT_AC431_services_grid_collapses_to_single_column_below_md",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-432: services-grid rejects items array with cardinality outside 2..6 test_UAT_AC432_services_grid_rejects_item_count_outside_2_to_6",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-433: contact-form renders one labeled input per field with the right type/name/required test_UAT_AC433_contact_form_renders_labeled_input_per_field",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-434: contact-form submits to the configured action URL test_UAT_AC434_contact_form_submits_to_configured_action_url",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-435: contact-form renders a visually concealed honeypot input test_UAT_AC435_contact_form_renders_hidden_honeypot_input",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-436: contact-form renders a Turnstile mount-target element test_UAT_AC436_contact_form_renders_turnstile_mount_target",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-437: contact-form submits via standard HTML POST without JS test_UAT_AC437_contact_form_submits_via_html_post_without_js",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-438: contact-form intercepts submit and posts JSON to action URL test_UAT_AC438_contact_form_intercepts_submit_and_posts_json",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-439: contact-form replaces itself with success message on 2xx test_UAT_AC439_contact_form_replaces_with_success_message_on_2xx",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-440: contact-form remains visible and surfaces inline error on non-2xx test_UAT_AC440_contact_form_renders_inline_error_on_non_2xx",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-441: content validator accepts list-of, nested object, and enum shapes test_UAT_AC441_content_validator_accepts_list_of_object_enum",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-442: framework module registry resolves all six Phase 0 modules test_UAT_AC442_registry_resolves_all_six_phase0_modules",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-456: marketing site definition declares the Phase 0 seven-module home page with in-page-anchors navigation test_UAT_AC456_marketing_site_definition_phase0_seven_modules",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-457: marketing site definition uses Manrope/Inter typography and the primary/accent palette test_UAT_AC457_marketing_site_typography_and_palette",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-458/AC-459/AC-460: public-site Worker serves the freshly-generated 1stcontact bundle test_UAT_AC458_get_root_returns_marketing_html_with_anchors",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-458/AC-459/AC-460: public-site Worker serves the freshly-generated 1stcontact bundle test_UAT_AC459_get_theme_css_returns_token_declarations",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-458/AC-459/AC-460: public-site Worker serves the freshly-generated 1stcontact bundle test_UAT_AC460_get_unknown_path_returns_404",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-461: public-site build, deploy, and dryrun scripts regenerate the static bundle before continuing test_UAT_AC461_public_site_scripts_regenerate_bundle_before_downstream",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-462: CI workflow runs the public-site generate step before tests and before the public-site dry-run deploy test_UAT_AC462_ci_workflow_generates_before_tests_and_dryrun",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-463: deploy workflow runs the public-site generate step before the public-site wrangler deploy test_UAT_AC463_deploy_workflow_generates_before_wrangler_deploy",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-464: leads table is created by migration 0001 with the CRM Lite schema and indexes test_UAT_AC464_leads_migration_creates_table_and_indexes",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-465: POST /api/forms/contact with a valid submission persists a lead and returns 200 with a lead_id test_UAT_AC465_valid_submission_inserts_lead_and_returns_lead_id",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-466: Submission with the honeypot field populated returns a success response but writes no lead and sends no notification test_UAT_AC466_honeypot_filled_returns_success_no_row_no_email",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-467: Submission with non-application/json content-type is rejected with 400 INVALID_CONTENT_TYPE test_UAT_AC467_non_json_content_type_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-468: Submission with malformed JSON body is rejected with 400 INVALID_JSON test_UAT_AC468_malformed_json_body_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-469: Submission missing the email field is rejected with 400 MISSING_FIELD and writes no lead test_UAT_AC469_missing_or_blank_email_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-470: Submission with a malformed email is rejected with 400 INVALID_EMAIL and writes no lead test_UAT_AC470_malformed_email_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-471: When Turnstile is configured, a submission whose token fails verification is rejected with 400 TURNSTILE_FAILED and writes no lead and sends no notification test_UAT_AC471_failed_or_missing_turnstile_rejected",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-472: Persisted lead's ip_country is populated from the CF-IPCountry request header test_UAT_AC472_ip_country_populated_from_cf_header",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-473: Non-canonical submission fields are preserved in the lead's extra_fields JSON column test_UAT_AC473_extra_fields_captures_non_canonical_fields_or_null",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-474: Best-effort owner notification failures do not fail the request \u2014 the lead is persisted and the response is 200 test_UAT_AC474_resend_failure_does_not_fail_request",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-475: Generated pages containing a contact-form module include the Turnstile script and site-key meta when a Turnstile site key is configured test_UAT_AC475_turnstile_emitted_only_when_form_and_key_present",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-476: Contact-form client island attaches the Turnstile response token to its JSON submission when a Turnstile widget is rendered test_UAT_AC476_island_includes_or_omits_turnstile_token",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-477: GET /builder and /builder/ return the SPA shell via Workers Static Assets test_UAT_AC477_builder_route_serves_spa_shell_and_passes_other_assets",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-478: chat panel collapses to a 32px restore rail and restores remembered width across reload test_UAT_AC478_chat_panel_collapses_restores_and_persists_state",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-479: collapsed restore rail sits on the left edge of the preview, not the right test_UAT_AC479_restore_rail_sits_left_of_preview_in_dom_order",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-480: splitter drag resizes the chat panel, clamps to min and max, and persists the final width test_UAT_AC480_splitter_drag_resizes_clamps_persists_and_rehydrates",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-481: preview viewport presets resize the iframe to mobile 375px, tablet 768px, desktop 100% test_UAT_AC481_viewport_presets_resize_iframe_and_track_active_state",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-482: preview iframe fills the full height of its panel rather than collapsing to the iframe default test_UAT_AC482_preview_iframe_fills_panel_height_via_flex_column_contract",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-483: accepted AI tool call advances the working site and re-renders the preview test_UAT_AC483_accepted_set_theme_token_updates_store_and_preview_iframe",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-484: rejected AI tool call leaves site state unchanged and records a structured error in the chat log test_UAT_AC484_invalid_set_module_dial_rejected_with_structured_error",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-485: working site definition is persisted to browser storage and survives builder re-mount test_UAT_AC485_site_definition_persisted_survives_remount_and_warns_when_too_large",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-486: POST /api/chat proxies the Anthropic Messages API and returns extracted text and tool_use blocks test_UAT_AC486_chat_endpoint_forwards_to_anthropic_and_extracts_text_and_tool_use_blocks",
          "file": "",
          "status": "passed"
        },
        {
          "name": "UAT AC-487: POST /api/chat returns 500 when API key is missing and 502 when the upstream call fails test_UAT_AC487_chat_endpoint_returns_500_when_key_missing_and_502_on_upstream_errors",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC443_cli_accepts_site_out_clean_flags",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC444_runGenerate_returns_result_describing_outputs",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC448_every_page_links_to_assets_theme_css",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC449_head_emits_viewport_title_description_og_metadata",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC451_assets_copied_preserving_relative_paths",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC454_clean_flag_wipes_output_directory",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-d111f966: static site generator (reconciliation) test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC403_root_block_contains_custom_property_for_every_locked_slot",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC404_supplied_values_appear_verbatim_in_custom_properties",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC405_partial_token_input_fills_unspecified_slots_from_defaults",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC406_no_input_produces_fully_defaulted_stylesheet",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC407_dark_palette_emits_media_block_with_only_supplied_color_roles",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC408_vetted_fonts_shortlist_publishes_13_families_with_metadata",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC409_font_family_declaration_resolves_case_insensitively_ignoring_quotes",
          "file": "",
          "status": "passed"
        },
        {
          "name": "Story story-e53ba4cf: theme tokens \u2192 CSS custom properties + vetted fonts test_UAT_AC410_google_fonts_url_lists_each_family_with_weights_and_display_swap",
          "file": "",
          "status": "passed"
        }
      ],
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
          "test_name": "project.min_coverage",
          "k_eligible": false,
          "error_type": "config_error",
          "message": "Coverage 0.0% below minimum 25.0%",
          "suggested_fix": "Add tests to increase coverage",
          "field": "project.min_coverage",
          "kind": "quality_config_violation"
        }
      ],
      "tests": []
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
      }
    ]
  }
}