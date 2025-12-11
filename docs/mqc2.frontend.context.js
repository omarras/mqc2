/**
 * MQC 2.0 – Frontend Master Context
 *
 * This file allows ChatGPT to fully recover your front-end architecture
 * without re-reading App.vue or the full conversation history.
 *
 * CONTENTS:
 *  - Global architecture overview
 *  - Run modes & state structure
 *  - Screenshot (desktop + mobile) pipeline rules
 *  - Check toggles and UI rules
 *  - SSE pipeline behaviour
 *  - Data model (single, bulk, fetch)
 *  - Component contracts
 *  - URL normalisation rules
 *  - Refactor roadmap for modularising App.vue
 */

export const mqc2FrontendContext = {

///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// 1. GLOBAL OVERVIEW ////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    project: {
        name: "MQC 2.0 (Migration Quality Checker)",
        stack: "Vue 3 + Vite",
        purpose: `
      The frontend provides a unified interface to compare old AEM pages with 
      new Contentstack pages using multiple modules:
      screenshots, text diff, link checker, SEO, performance, best practices, 
      accessibility, etc.

      Supported run modes:
      • Single compare
      • Bulk compare (CSV)
      • Fetch compare (pull CSV remotely)
      
      - Desktop screenshot diff
      - Mobile screenshot preview
      - Text comparison
      - Link checker
      - SEO rules
      - Performance, Best Practices, Accessibility
    `,

        communication: `
      REST for starting runs (single, bulk, fetch)
      SSE for real-time streaming of run results
    `
    },

///////////////////////////////////////////////////////////////////////////////
///////////////////////// 2. RUN MODES & INPUT MODEL //////////////////////////
///////////////////////////////////////////////////////////////////////////////

    runModes: {
        single: "User enters two URLs. POST /single → runId → SSE stream.",
        bulk:   "User uploads CSV. POST /bulk → stream row-results.",
        fetch:  "User enters country + businessUnit. POST /fetch → remote CSV → stream."
    },

    inputs: {
        single: ["oldUrl", "newUrl"],
        bulk: ["csvFile"],
        fetch: ["country", "businessUnit", "runName"]
    },

    inputDetails: `
    Country dropdown:
      • pulled live from /locales/countries
      • sorted alphabetically
      • persists last selection in localStorage

    Business Unit dropdown:
      • PH, BL, PH+BL
      • human-readable labels
      • persists in localStorage
  `,

///////////////////////////////////////////////////////////////////////////////
///////////////////////////// 3. CHECK TOGGLES ////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    checkDefinitions: [
        { key: "screenshot-desktop", label: "Desktop Screenshot" },
        { key: "screenshot-mobile", label: "Mobile Screenshot" },
        { key: "text-comparison", label: "Text Comparison" },
        { key: "link-checker", label: "Link Checker" },
        { key: "seo", label: "SEO" },
        { key: "performance", label: "Performance" },
        { key: "best-practices", label: "Best Practices" },
        { key: "accessibility", label: "Accessibility" }
    ],

    toggleRules: `
    All toggles persist in localStorage and directly control backend execution.
    If a toggle is off, backend is instructed to skip that module.
    SEO toggle loads full SEO rule set.
  `,

///////////////////////////////////////////////////////////////////////////////
//////////////////////// 4. SCREENSHOT PIPELINE RULES /////////////////////////
///////////////////////////////////////////////////////////////////////////////

    screenshotPipeline: `
    Desktop:
      - Backend produces PNGs & diff image.
      - Frontend displays side-by-side with modal comparison.
      - Loading flags: screenshots.shotsLoading

    Mobile:
      - Mobile screenshot captured by automated mobile viewport.
      - Wrapped in <MobileFrame> and enlarges using <MobileModal>.
      - Loading flag: screenshots.mobileLoading
  `,

///////////////////////////////////////////////////////////////////////////////
////////////////////////////// 5. SSE PIPELINE ////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    sse: {
        endpoints: {
            single: "/console/ph-pse/mqc/api/runs/single",
            bulk:   "/console/ph-pse/mqc/api/runs/bulk",
            fetch:  "/console/ph-pse/mqc/api/runs/fetch",
            streamFor: (runId) => `/console/ph-pse/mqc/api/runs/${runId}/stream`
        },

        singleEvents: `
      event: result | step-result | row-result
        payload.key → module type (text-comparison, link-checker, screenshot, seo, seo-rules)
        payload.data → module output

      event: run-complete → single run finished
    `,

        bulkEvents: `
      event: row-init → create row: { rowIndex, oldUrl, newUrl }
      event: row-result → patch a specific module into row.report
      event: row-error → store row-level error
      event: bulk-complete → all rows streamed

      Missing checks are later retried via retryMissingAfterBulk().
    `
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////////////// 6. DATA MODEL //////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    singleReportShape: `
    {
      oldUrl, newUrl,

      content: { textCoveragePct, textDiff: [] },
      screenshots: {
        oldPngPath,
        newPngPath,
        mobilePngPath,
        shotsLoading,
        mobileLoading
      },

      text: {
        ops,
        equals,
        missing,
        added,
        contentParity
      },

      links: {
        old, new, summary
      },

      seo: {
        oldScore,
        newScore,
        delta,
        rules: [] // each rule: { id, topic, label, oldValue, newValue, pass }
      },

      performance: { psi, lighthouse, summary },
      bestPractices: { old, new, delta, data },
      a11y: { old, new, delta, violations },
      linkChecker: { data }
    }
  `,

    bulkReportShape: `
    bulk.rows[rowIndex] = {
      index,
      report: same shape as single,
      flags: { text, seo, linkChecker, performance, a11y, bestPractices },
      shotsLoading,
      error
    }
  `,

///////////////////////////////////////////////////////////////////////////////
/////////////////////////// 7. SEO RULES OVERVIEW /////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    seoRulesEngine: `
    Each SEO rule lives under /src/seoRules/rules/*.js

    Contract:
      export default {
        id,
        topic,
        label,
        weight,
        preferred,
        async run({ old, newSeo }) → { oldValue, newValue, pass }
      }

    Rules included (examples):
      - htmlLangPresent .................................. [rule ref 0]
      - htmlLangLocaleMatch .............................. [rule ref 1]
      - htmlLangIsoFormat ................................ [rule ref 2]
      - htmlLangRtl ...................................... [rule ref 3]
      - canonicalPresent ................................. [rule ref 4]
      - canonicalAbsolute ................................ [rule ref 5]
      - canonicalSelfRef ................................. [rule ref 6]
      - metaTitleLength .................................. [rule ref 7]
      - metaDescriptionLength ............................ [rule ref 8]
      - metaDescriptionSame .............................. [rule ref 9]
      - metaTitleSame .................................... [rule ref 10]
      - urlLowercase ..................................... [rule ref 11]
      - urlHttps ......................................... [rule ref 12]
      - urlTrailingSlash ................................. [rule ref 13]
      - urlFragments ..................................... [rule ref 14]
      - urlParams ........................................ [rule ref 15]
      - urlHyphens ....................................... [rule ref 16]
      - urlPathMatch ..................................... [rule ref 17]
      - robotsIndex ...................................... [rule ref 18]
      - urlUtf8 .......................................... [rule ref 19]

    SEO extractors:
      seoExtract.js ...................................... [extractor ref]
  `,

///////////////////////////////////////////////////////////////////////////////
//////////////////////////// 8. COMPONENT CONTRACTS ///////////////////////////
///////////////////////////////////////////////////////////////////////////////

    components: {
        ModeSelector: `
      Manages switching between runMode = single | bulk | fetch
      Emits: update:runMode
    `,

        SingleInputs: `
      props: { oldUrl, newUrl }
      Emits: update:oldUrl, update:newUrl
    `,

        BulkUploader: `
      CSV dropzone (only visible in bulk mode)
      Emits: update:file
    `,

        FetchInputs: `
      Country dropdown + Business Unit dropdown + optional runName
      Integrates:
        - /locales/countries API
        - BU presets (PH, BL, PH+BL)
        - Persist last choice
      Emits:
        update:country, update:bu, update:runName
    `,

        GaugeMeter: `
      props: { value, label, size }
      animated radial gauge + loader
    `,

        Screenshots: `
      props:
        - loading
        - oldSrc
        - newSrc
      Emits:
        - compare { old, new }
      Opens desktop comparison modal.
    `,

        MobileFrame: `
      Displays iPhone X frame with screenshot.
      props:
        - src
        - loading
      emits:
        - open   // triggers MobileModal
    `,

        MobileModal: `
      Fullscreen modal with dynamic phone scaling.
      props:
        - open
        - src
        - loading
      emits:
        - close
      Behaviour:
        - Locks scroll on open
        - Centers phone, scales to maintain aspect ratio
    `,

        TextDiff: `
      props: { loading, ops }
      Quill-style diff of text segments.
    `,

        LinkChecker: `
      props: { loading, data, toggles }
      Displays link score, summary and visual quality signal.
    `,

        Seo: `
      props: { loading, seo, rules }
      Renders SEO score and rule violations.
    `,

        Performance: `
      props: { loading, performance }
      Renders PSI or Lighthouse metrics & opportunities.
    `,

        BestPractices: `
      props: { loading, data }
      Pass/fail items from Lighthouse.
    `,

        Accessibility: `
      props: { loading, a11y }
      Displays WCAG violations.
    `
    },

///////////////////////////////////////////////////////////////////////////////
//////////////////////////// 9. UI RULES //////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    uiRules: {
        segmentedControl: `
      runMode === single → two URL fields
      runMode === bulk → CSV dropzone
      runMode === fetch → fetch inputs
    `,

        dropdowns: `
      - Country + BU dropdowns follow dark-theme and match field inputs
      - Dropdown panel width = trigger width
      - Only one dropdown open at a time
      - Clicking outside closes all dropdowns
    `,

        csvDropzone: `
      Must be shown ONLY when runMode === 'bulk'.
    `,

        gaugeRules: `
      Gauges appear only if toggle enabled.
      Gauges load independently via flags.
    `,

        diffTable: `
      Color-coded segments (equal, added, removed).
    `
    },

///////////////////////////////////////////////////////////////////////////////
/////////////////// 10. PUBLIC PATH NORMALISATION RULES /////////////////////////
///////////////////////////////////////////////////////////////////////////////

    urlRules: {
        publicUrl: `
      If absolute → return as-is.
      If starts with API_BASE → return as-is.
      If starts with /tmp → prefix with API_BASE.
      Else prefix with API_BASE.
    `
    },

///////////////////////////////////////////////////////////////////////////////
///////////////////////////// 11. REFACTOR ROADMAP /////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    plannedRefactor: {
        goal: `
      Reduce App.vue complexity.
      Maintain full functionality at all times.
      Introduce composables for SSE and state.
    `,

        steps: [
            "1. Extract ModeSelector (no logic risk).",
            "2. Extract SingleInputs, BulkUploader, FetchInputs.",
            "3. Extract TogglesPanel.",
            "4. Extract Results wrappers (Single, Bulk, Fetch).",
            "5. Move SSE logic to useSseClient.js.",
            "6. Move state (selected checks, flags, reports) to useRunStore.js.",
            "7. Move applyPartial*, emptyVm(), retry logic into useReportModel.js.",
            "8. App.vue becomes a thin orchestrator."
        ]
    }
};
