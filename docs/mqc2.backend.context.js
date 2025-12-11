/**
 * MQC 2.0 – Backend Master Context (Updated 2025)
 *
 * This file contains:
 * - Full architecture overview
 * - Internal orchestration logic
 * - Unified SSE output spec (row-start, row-update, row-result, row-final, row-done)
 * - Two-phase scan pipeline (pageDataCheck → heavy checks)
 * - Queues, concurrency rules, memory-only HTML handling
 * - API catalog (single, bulk, fetch, rescans, reruns, CRUD)
 * - Folder structure
 * - Data model responsibilities
 *
 * This context allows ChatGPT to reconstruct the full backend architecture
 * without reading the codebase again in future conversations.
 */

export const mqc2BackendContext = {

///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// 0. NEW DESIGN 2025 /////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    newBackendDesign: {

        purpose: `
        Allow very large runs (50–1000 scans) to start instantly by emitting
        all row-start events immediately, performing fast metadata validation
        first, and only running heavy browser checks after Phase 1 finishes.
        Frontend receives normalized results via "row-final" events.
        `,

        coreBehaviors: [

            /* -------------------------------------------------------------
             * 1. EARLY ROW INITIALIZATION (SSE: row-start)
             * ----------------------------------------------------------- */
            `
            Immediately after a run is created, every scan emits "row-start".
            This enables the frontend to fully render the table instantly,
            without waiting for any network or browser operations.
            `,

            /* -------------------------------------------------------------
             * 2. STRICT TWO-PHASE PIPELINE WITH BARRIER
             * ----------------------------------------------------------- */
            `
            Phase 1 (fast):
              - pageDataCheck for ALL scans of the run
              - Lightweight HEAD/GET requests
              - Metadata extraction (title, locale, platform, status)
              - Emits row-update(pageDataCheck)
              - If shouldContinue=false → scan aborts immediately,
                emits row-final and row-done, never enters Phase 2.

            STRICT BARRIER:
              Phase 2 cannot begin until ALL pageDataCheck operations from
              Phase 1 have completed for that run.

            Phase 2 (heavy):
              - text comparison
              - link checker
              - seo analysis
              - screenshot / visual checks (Playwright)
              - Each step emits row-result
              - At the very end, emits row-final and row-done
            `,

            /* -------------------------------------------------------------
             * 3. pageDataCheck is always lightweight and fast
             * ----------------------------------------------------------- */
            `
            pageDataCheck:
              - No Playwright, no heavy HTML parsing
              - Uses fetch(url, { redirect: "manual" })
              - Extracts:
                    httpStatus
                    httpStatusText
                    title
                    locale + mapping
                    platform detection
              - No HTML stored in DB
              - scanContext used for temporary in-memory data
            `,

            /* -------------------------------------------------------------
             * 4. PHASE 2 USES ONE LIGHTWEIGHT HTML FETCH PER URL
             * ----------------------------------------------------------- */
            `
            Before heavy checks begin, heavyPipeline performs:
                htmlOld_http = fetch(noCacheUrl_old).text()
                htmlNew_http = fetch(noCacheUrl_new).text()

            These two HTML strings are stored ONLY in scanContext
            and are shared by:
                - textCheck
                - seoCheck
                - linkCheck

            If Playwright is enabled (visualComparisonDesktop, screenshotMobile),
            the Playwright-rendered HTML overrides http HTML:
                scanContext.htmlOld_playwright
                scanContext.htmlNew_playwright

            No HTML is persisted in Mongo.
            `,

            /* -------------------------------------------------------------
             * 5. UNIFIED "row-final" EVENT FOR ALL MODES
             * ----------------------------------------------------------- */
            `
            At the end of every scan (success or failure), backend emits:

                event: "row-final"
                rowIndex: scanId
                data: {
                   urls: { old, new },
                   pageDataCheck,
                   text,
                   links,
                   seo,
                   screenshotDesktop,
                   screenshotMobile
                }

            This normalized payload is identical for:
               - single runs
               - bulk runs
               - fetch runs

            Frontend has one single code path.
            `,

            /* -------------------------------------------------------------
             * 6. QUEUE RULES (RUNQUEUE + FASTQUEUE + SLOWQUEUE)
             * ----------------------------------------------------------- */
            `
            runQueue:
                - concurrency: 1
                - Only one run can be "executing" at a time

            fastQueue:
                - concurrency: ~15
                - Used for Phase 1 pageDataCheck (HTTP only)

            slowQueue:
                - concurrency: ~2
                - Used for Phase 2 heavy browser steps
            `,

            /* -------------------------------------------------------------
             * 7. EARLY FAIL-FLAG SHORT CIRCUIT
             * ----------------------------------------------------------- */
            `
            If pageDataCheck.shouldContinue=false:
               - scan is marked failed
               - results saved (only pageDataCheck)
               - emits row-final (minimal payload)
               - emits row-done
               - scan never enters Phase 2
            `
        ]
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////////// 1. PROJECT SUMMARY ////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    project: {
        name: "MQC 2.0 (Migration Quality Checker)",
        purpose: `
        Compare legacy AEM pages (urlOld) with ContentStack pages (urlNew)
        at scale across 69 countries and 89 locales.

        The backend:
        - Accepts CSV or API generated lists of URL pairs
        - Scans each pair by running modular pluggable “checks”
        - Produces screenshots, text comparison results, link validation,
          SEO analysis, and metadata outputs
        - Streams real-time progress over SSE
        - Supports rescans, reruns, and full CRUD on scans within a run
    `,
        techStack: {
            language: "Node.js (ESM)",
            framework: "Express",
            database: "MongoDB + Mongoose",
            queueing: "P-Queue (runQueue + scanQueue)",
            scraping: "Playwright (Chromium)",
            parsing: "cheerio",
            realtime: "Server Sent Events (SSE)"
        }
    },

///////////////////////////////////////////////////////////////////////////////
/////////////////////////// 2. UNIFIED SSE SPEC //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    sse: {
        events: {
            rowStart: `
event: "row-start"
→ emitted for every scan immediately after creation
            `,
            rowUpdate: `
event: "row-update"
→ emitted after pageDataCheck completes
payload:
{
    rowIndex,
    key: "pageDataCheck",
    data: {...}
}
            `,
            rowResult: `
event: "row-result"
→ emitted per-step during heavy pipeline
payload:
{
    rowIndex,
    key: "text-comparison"|"link-checker"|"seo"|"screenshot"|"screenshot-mobile",
    data: stepResult
}
            `,
            rowFinal: `
event: "row-final"
→ emitted once per scan at the end of Phase 2 (or early abort)
Unified final structure:
{
    urls: { old, new },
    pageDataCheck,
    text,
    links,
    seo,
    screenshotDesktop,
    screenshotMobile
}
            `,
            rowDone: `
event: "row-done"
→ compatibility event
Indicates the scan is fully finished
            `,
            rowError: `
event: "row-error"
→ only for failures (Phase 1 or Phase 2)
            `,
            runComplete: `
event: "run-complete"
→ emitted when all scans in the run have finished
            `
        }
    },

///////////////////////////////////////////////////////////////////////////////
/////////////////////// 3. FOLDER STRUCTURE (EXACT) //////////////////////////
///////////////////////////////////////////////////////////////////////////////

    folderTree: `
server/
└── src/
    ├── browser/
    │   ├── cmp.js
    │   ├── network.js
    │   └── screenshots.js
    ├── checks/
    │   └── screenshotCheck.js
    ├── config/
    │   ├── businessUnits.js
    │   ├── checkProfiles.js
    │   ├── countryLocales.js
    │   ├── env.js
    │   └── mongo.js
    ├── controllers/
    │   ├── debug.controller.js
    │   ├── health.controller.js
    │   └── run.controller.js
    ├── middleware/
    │   ├── errorHandler.js
    │   └── validate.js
    ├── models/
    │   ├── Run.js
    │   └── Scan.js
    ├── pipeline/
    │   ├── steps/
    │   │   ├── checkRegistry.js
    │   │   ├── htmlCheck.js
    │   │   ├── lighthouseCheck.js
    │   │   ├── linkCheck.js
    │   │   ├── pageDataCheck.js
    │   │   ├── screenshotMobileStep.js
    │   │   ├── textCheck.js
    │   │   ├── seoCheck.js
    │   │   └── visualComparisonDesktopStep.js
    │   └── scanPipeline.js
    ├── routes/
    │   ├── debug.routes.js
    │   ├── index.js
    │   └── run.routes.js
    ├── services/
    │   ├── browser.service.js
    │   ├── enqueueScan.service.js
    │   ├── run.service.js
    │   ├── runQueue.service.js
    │   ├── scan.service.js
    │   ├── scanLatest.service.js
    │   ├── scanQueue.service.js
    │   └── sse.service.js
    ├── shared/
    │   ├── constants.js
    │   └── url-utils.js
    ├── textComparison/
    │   ├── helpers/
    │   │   └── textExtractors.js
    │   ├── step1_excludes/
    │   │   ├── excludeEngine.js
    │   │   └── platformRules.js
    │   ├── step2_visibility/
    │   │   ├── platformVisibilityRules.js
    │   │   └── visibilityEngine.js
    │   ├── step3_extraction/
    │   │   ├── extractText.js
    │   │   ├── extractTextFromDom.js
    │   │   └── textCleanup.js
    │   ├── step4_diff/
    │   │   └── diffFragments.js
    │   ├── step6_wordDiff/
    │   │   └── wordSimilarity.js
    │   ├── step7_contentParity/
    │   │   └── computeContentParity.js
    │   └── (step8_translation, step9_visualHighlight planned)
    ├── seoRules/
    │   ├── engines/
    │   │   ├── runRules.js
    │   │   ├── weightNormalize.js
    │   ├── extract/
    │   │   └── seoExtract.js
    │   ├── rules/
    │   │   ├── urlPathMatch.js
    │   │   ├── url-params.js
    │   │   ├── url-fragments.js
    │   │   ├── url-trailing-slash.js
    │   │   ├── canonical-present.js
    │   │   ├── (etc… all metadata rules)
    ├── textComparison/
    ├── utils/
    │   ├── csv.js
    │   └── logger.js
    ├── validators/
    │   ├── run.validators.js
    │   ├── util.js
    │   └── index.js

root/
    ├── .env
    ├── package.json
    ├── package-lock.json
    ├── dev.Dockerfile
    ├── docker-compose.dev.yml
    ├── docker-compose.prod.yml
    ├── run_dev.sh
    ├── docs/
    └── mqc2.backend.context.js
`,

///////////////////////////////////////////////////////////////////////////////
/////////////////////////// 3. DATA MODEL ///////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    models: {

        Run: {
            fields: {
                type: "single | bulk | fetch",
                runName: "string | null",
                runNameAuto: "generated fallback",
                status: "pending | running | completed",
                scans: "[ObjectId -> Scan]",
                totalScans: "int",
                completedScans: "int",
                failedScans: "int",
                createdAt: "Date",
                completedAt: "Date | null"
            },
            relations: `
            A Run has many Scans.
            Rescans and reruns are also scans under the same Run.
            parentScanId=null => original scope scan.
            parentScanId=someId => a rescan of that scan.
        `
        },

        Scan: {
            fields: {
                runId: "ObjectId -> Run",
                parentScanId: "ObjectId | null (for rescans or reruns)",
                urlOld: "string",
                urlNew: "string",
                status: "pending | running | completed | failed",
                results: "object (pageDataCheck, html, text, screenshots…)",
                metadata: "object",
                checkConfig: "object",
                error: "string | null",
                deleted: "boolean | default false",
                createdAt: "Date",
                completedAt: "Date | null"
            }
        }
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////////// 4. QUEUE SYSTEM ///////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    queues: {
        runQueue: {
            file: "services/runQueue.service.js",
            implementation: "PQueue({ concurrency: 1 })",
            purpose: `
            Guarantee: only one run executes its scans at a time.
            When a run reaches the queue head:
                markRunning(runId) → enqueue all scans.
        `
        },

        scanQueue: {
            file: "services/scanQueue.service.js",
            implementation: "PQueue({ concurrency: SCAN_CONCURRENCY })",
            purpose: `
            Limits concurrent scans. Used by heavy tasks:
                - Playwright page loads
                - Screenshot generation
                - HTML parsing
        `
        }
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////// 5. SCAN ORCHESTRATION /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    pipeline: {

        phases: {
            overview: `
Phase 1 → pageDataCheck
Phase 2 → heavy checks (text, links, seo, screenshots)
            `,
        },

        pageDataPipeline: `
- markScanRunning
- run pageDataCheck
- save metadata.pageDataCheck
- emit row-update
- if shouldContinue=false:
      mark failed
      emit row-final (minimal payload)
      emit row-done
      STOP
- emit row-done (phase 1 complete)
        `,

        heavyPipeline: `
- markScanRunning
- load metadata.pageDataCheck
- fetch htmlOld_http and htmlNew_http (one time)
- run each enabled check:
      handler(...)
      results[step] = stepResult
      emit row-result
- save results
- markScanCompleted
- reload scan
- emit row-final (normalized object)
- emit row-done
        `,

        normalizeResultsForFrontend: `
normalizeResultsForFrontend(scan, results):
{
    urls: { old, new },
    pageDataCheck: scan.metadata.pageDataCheck,
    text: results.text,
    links: results.links,
    seo: results.seo,
    screenshotDesktop: results.visualComparisonDesktop || results.screenshot,
    screenshotMobile: results.screenshotMobile
}
        `
    },

    scanLifecycle: `
SCAN STATES:
    pending → running → completed
                     ↘ failed

PIPELINE FLOW FOR EACH SCAN:
    1. markScanRunning(scanId)
    2. pageDataCheck (always first)
         if shouldContinue=false:
             - save pageDataCheck result
             - markScanFailed
             - update counters
             - stop pipeline
    3. For each enabled step in checkConfig:
         - run handler from CHECK_REGISTRY
         - if it throws:
             - markScanFailed
             - stop pipeline
         - else save result under scan.results
    4. markScanCompleted
    5. Recalculate run counters (scanLatest.service.js)
    6. When all original-scope scans have a latest completed/failed generation:
         mark run completed
`,

///////////////////////////////////////////////////////////////////////////////
//////////////////// 6. PAGE DATA CHECK + URL HANDLING ///////////////////////
///////////////////////////////////////////////////////////////////////////////

    pageDataCheck: {
        behavior: `
        Uses fetch(url, { redirect:"manual" }) to:
        - Capture FIRST status code (301, 302, 308, etc.)
        - Avoid auto-following redirects

        Extracts:
            httpStatus, httpStatusText, durationMs, error, platform

        For urlNew:
            - title
            - locale code
            - language/country mapping

        Creates:
            originalUrl  (used for screenshot hashing)
            noCacheUrl   (ensures fresh Playwright loads)
            
        - HTTP HTML stored as:
      scanContext.htmlOld_http
      scanContext.htmlNew_http

- Playwright-rendered HTML overrides HTTP HTML when available:
      scanContext.htmlOld_playwright
      scanContext.htmlNew_playwright

- textCheck prefers:
      playwright HTML → http HTML

- seoCheck ALWAYS uses HTTP HTML

- linkCheck uses HTTP HTML

        Raw HTML is NOT persisted to Mongo; kept only in-memory in scanContext.
    `
    },

///////////////////////////////////////////////////////////////////////////////
/////////////////////// 7. VISUAL ENGINE (PLAYWRIGHT) ////////////////////////
///////////////////////////////////////////////////////////////////////////////

    playwright: {

        browserService: `
        getBrowser():
        - Singleton Chromium instance reused across scans.
        - Avoids repeated launches.
        - Resilient to crashes with auto-recovery.
    `,

        screenshotCheck: `
        Modes:
         - desktopPair: capture AEM+CS desktop
         - mobileOnly: capture mobile CS screenshot

        Includes:
         - autoAcceptCookies
         - hideSelectors
         - lazy scroll
         - saving PNGs in /tmp
    `,

        screenshotKey: `
        screenshotKey(url, suffix):
        → hash(url) + "-" + suffix
        Provides stable deterministic filenames.
    `
    },

///////////////////////////////////////////////////////////////////////////////
//////////////////// 8. PIPELINE STEPS (CHECKS) ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    steps: {

        registryFile: "pipeline/steps/checkRegistry.js",

        availableSteps: [
            "html",
            "text",
            "seo",
            "links",
            "images",
            "lighthouse",
            "visualComparisonDesktop",
            "screenshotMobile"
        ],

        implementations: {
            pageDataCheck: "pipeline/steps/pageDataCheck.js",
            visualComparisonDesktop: "pipeline/steps/visualComparisonDesktopStep.js",
            screenshotMobile: "pipeline/steps/screenshotMobileStep.js",
            text: `
                pipeline/steps/textCheck.js

                Text step performs:
                Step 1 → platform excludes
                Step 2 → visibility filtering
                Step 3 → text extraction
                Step 4 → fragment-level diff
                Step 6 → similarity-based diff (80 percent threshold)
                Step 7 → content parity (word-based)

                Final output:
                {
                  equals: [...exact or similar],
                  missing: [...],
                  added: [...],
                  contentParity: {
                    score,
                    percentages: { equal, missing, added },
                    counts: { totalWords, equalWords, missingWords, addedWords }
                  }
                }
            `,

            seo: `
                pipeline/steps/seoCheck.js

                Modular SEO rule engine:
                - Extracts SEO-relevant data from HTML (head/meta/og/twitter/schema)
                - Discovers rules dynamically in /seoRules/rules
                - Each rule returns pass/false + extracted values
                - Weight normalization produces normalizedWeight + score
                - Output:
                  {
                    rules: [...],   // enriched rules with score + normalizedWeight
                    errors: [...],  // subset where pass=false
                    summary: {
                      globalScore,
                      totalWeight,
                      activeRules
                    }
                  }
            `,

            links: `
                pipeline/steps/linkCheck.js
                Validates internal/external links from cleaned HTML.
                Captures:
                  - initialStatus (first hop)
                  - finalStatus (after redirects)
                  - redirectChain[]
                  - HTTPS check
                Weighted scoring:
                  perfect=1, redirect/http=0.5, redirect+http=0.25, error=0.
            `,

            html: "pipeline/steps/htmlCheck.js (placeholder)",

            lighthouse: "pipeline/steps/lighthouseCheck.js (future)",

        }
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////// 9. TEXT COMPARISON SUBSYSTEM //////////////////////////
///////////////////////////////////////////////////////////////////////////////

    textComparison: {

        purpose: `
        Compare the visible content of AEM and ContentStack pages using
        multi-phase processing: exclusions → visibility → extraction →
        structural diff → similarity diff → content parity metrics.
    `,

        phases: [
            {
                name: "Step 1 – platform excludes",
                status: "implemented",
                description: `
                Removes platform-specific chrome (header, footer, nav, captions)
                using selector- and comment-based rules.
                Eliminates noise before text extraction.
                `
            },
            {
                name: "Step 2 – visibility filtering",
                status: "implemented",
                description: `
                Removes all invisible text using:
                    - inline styles (display:none, visibility:hidden, opacity:0)
                    - class patterns (u-hidden, visuallyhidden, sr-only, etc.)
                    - aria-hidden
                    - [hidden]
                Produces the DOM as seen by the user.
                `
            },
            {
                name: "Step 3 – text extraction",
                status: "implemented",
                description: `
                Converts cleaned HTML into logical text fragments.
                - Removes markup
                - Normalizes whitespace
                - Avoids bubbling duplicate text
                Output:
                  step3Old.blocks[], step3New.blocks[]
                `
            },
            {
                name: "Step 4 – block-level diff",
                status: "implemented",
                description: `
                Identifies:
                    - exact equal blocks
                    - missing blocks
                    - added blocks
                Using strict string equality.
                Order-dependent at this level.
                `
            },
            {
                name: "Step 6 – word-level similarity + split",
                status: "implemented",
                description: `
                Attempts to match remaining blocks using word similarity.
                - Uses 85 percent threshold
                - Exact word matching only
                - Splits matches into equalText + missingWords + addedWords
                Produces more granular matches.
                `
            },
            {
                name: "Step 7 – content parity scoring",
                status: "implemented",
                description: `
                Computes the final similarity score for the page based on words.

                totalWords = max(step3Old.wordCount, step3New.wordCount)
                equalWords = words found equal or similar across all steps
                missingWords = words present only in AEM
                addedWords = words present only in ContentStack

                score = equalWords / totalWords

                Output:
                {
                  score,
                  percentages: { equal, missing, added },
                  counts: { totalWords, equalWords, missingWords, addedWords }
                }
                `
            },
            {
                name: "Step 8 – translation (optional)",
                status: "skipped-for-now",
                description: `
                LibreTranslate was considered but abandoned for now due to
                insufficient language coverage. Step reserved for future.
                `
            },
            {
                name: "Step 9 – visual highlight",
                status: "future",
                description: `
                Optional enhancement: highlight differences directly on
                rendered pages before screenshot capture. Depends on mapping
                diff results back into DOM nodes.
                `
            }
        ],

        files: {
            helpers: {
                textExtractors: "textComparison/helpers/textExtractors.js"
            },
            engines: {
                step1_excludeEngine: "textComparison/step1_excludes/excludeEngine.js",
                step2_visibilityEngine: "textComparison/step2_visibility/visibilityEngine.js"
            },
            extraction: {
                step3_extractText: "textComparison/step3_extraction/extractText.js",
                step3_extractTextFromDom: "textComparison/step3_extraction/extractTextFromDom.js"
            },
            diff: {
                step4_blockDiff: "textComparison/step4_diff/diffFragments.js"
            },
            similarity: {
                step6_wordDiff: "textComparison/step6_wordDiff/step6.js"
            },
            parity: {
                step7_contentParity: "textComparison/step7_contentParity/computeContentParity.js"
            }
        },

        sharedExtractor: `
        extractDeepText($, node)
        - Traverses DOM
        - Skips non visible or non text content
        - Normalizes whitespace
        Used by Step 1 debug, Step 2 debug, Step 3 extraction.
        `,

        debugPipeline: `
        POST /debug/text-excludes (dev only)
        Runs Step 1–3 on a single page for tuning exclusion/visibility rules.
        Returns word counts and extracted blocks.
        `
    },

///////////////////////////////////////////////////////////////////////////////
///////////////////////// 10. SEO ANALYSIS SUBSYSTEM //////////////////////////
///////////////////////////////////////////////////////////////////////////////

    seo: {

        purpose: `
        Provide structured, modular SEO rule checking with weighted scoring.
        Rules are executed consistently for old and new pages using a unified
        evaluation model that allows large-scale SEO auditing.
        `,

        majorEnhancements2025: `
        - Introduced passOld and passNew (instead of single pass flag)
        - Added preferred semantics (desired outcome true/false)
        - Added correct handling for preferred=false rules (inverted logic)
        - Introduced neutral flag for non-applicable cases (e.g. homepage, non-Arabic RTL)
        - Added charactersOld/charactersNew for length-based rules
        - Added staging exceptions in robots-index rule
        - Added canonical equivalence ignoring trailing slashes
        - Corrected UTF-8 detection & special character validation
        - Corrected URL hyphenation, slug parsing, query param handling
        - Universal verdict model: equal, improved, regression, neutral
        - Added normalized scoring across all rules
        `,

        architecture: `
        /src/seoRules/
            extract/
                seoExtract.js
                - Parses:
                    url → new URL(...)
                    meta → title/description/canonical
                    og:tags
                    twitter:tags
                    html lang
                    dir attribute
                    robots tag
                    headings (h1)
                - NEW: safe parsing (null URL handling)
                - NEW: raw HTML optionally provided for advanced rules (robots)

            engines/
                runRules.js
                - Dynamically loads every file in /seoRules/rules
                - Executes rule.run({ old, newSeo })
                - Injects:
                    - passOld, passNew
                    - preferred (from rule)
                    - neutral (from rule or rule result)
                - Computes:
                    oldCorrect = preferred ? passOld : !passOld
                    newCorrect = preferred ? passNew : !passNew
                - Verdict rules:
                    if neutral → "neutral"
                    else if oldCorrect && newCorrect → "equal"
                    else if !oldCorrect && newCorrect → "improved"
                    else → "regression"

                weightNormalize.js
                - Computes:
                    totalWeight = sum(rule.weight for non-neutral)
                    normalizedWeight = rule.weight / totalWeight
                    score = newCorrect ? normalizedWeight : 0
                - Produces:
                    globalScore = sum(rule.score)
        `,

        ruleModel: `
        Standard rule contract (2025):

        export default {
            id: " rule-id ",
            topic: "URL | Metadata | OpenGraph | Twitter | Schema",
            label: "Human readable description",
            weight: number,
            preferred: boolean,
            neutral?: boolean,   // optional

            async run({ old, newSeo }) {
                return {
                    oldValue: "string",
                    newValue: "string",

                    passOld: boolean | null,   // null = not applicable
                    passNew: boolean | null,

                    // Optional fields:
                    charactersOld?: number,
                    charactersNew?: number,

                    neutral?: boolean
                }
            }
        }
        `,

        keyRuleBehaviors: `
        URL RULES:
        - preferred=false means the "correct" answer is No
        - passNew=false means correct outcome when preferred=false
        - passNew=true means incorrect outcome (e.g., trailing slash exists)
        - Neutral for homepage (URL trailing slash)
        - UTF-8 rule: detects invalid percent encodings, spaces, underscores, etc.
        - Slug parsing: last segment of URL

        METADATA RULES:
        - Title/description comparisons trim whitespace and ignore trailing spaces
        - Length rules use charactersOld/charactersNew
        - Canonical-self-ref allows trailing slash equivalence
        - Canonical-present simply checks presence
        - Language detection:
            - html[lang] extracted from html lang=""
            - locale derived from meta[name="commonlocale"] or PHILIPS.CONTEXT.LOCALE
        - RTL rule:
            - Applies only when lang starts with "ar"
            - dir="rtl" required
            - Neutral otherwise (passOld=null, passNew=null)
        - robots-index:
            - Staging environments auto-neutral
            - Production requires "index" AND "follow"

        OG / TWITTER RULES (future):
        - Will follow same model for passOld/passNew/preferred
        - Ratio checks, presence checks

        VERDICT LOGIC (FINAL):
            if neutral → "neutral"
            else if oldCorrect && newCorrect → "equal"
            else if !oldCorrect && newCorrect → "improved"
            else → "regression"
        `,

        output: `
        seoCheck → {
            status: "ok",
            rules: [
                {
                  id,
                  topic,
                  label,
                  weight,
                  preferred,
                  neutral,
                  oldValue,
                  newValue,
                  passOld,
                  passNew,
                  charactersOld?,
                  charactersNew?,
                  verdict,
                  normalizedWeight,
                  score
                }
            ],
            errors: rules.filter(r => verdict=="regression"),
            summary: {
                globalScore,
                weights: {
                    totalWeight,
                    activeRules
                }
            }
        }
        `
    },

///////////////////////////////////////////////////////////////////////////////
/////////////////////////// 11. RUN CONTROLLER API ///////////////////////////
///////////////////////////////////////////////////////////////////////////////

    api: {
        basePath: "/console/ph-pse/mqc/api",

        endpoints: {

            single: `
POST /runs/single
Body:
{
  urlOld, urlNew,
  runName?,
  checkConfig?,
  visualComparisonDesktop?,
  screenshotMobile?
}
Response: { runId }
            `,

            bulk: `
POST /runs/bulk (multipart/form-data)
Body: { runName }
Response: { runId, totalRows, validScans, skipped }
            `,

            fetch: `
POST /runs/fetch
Body: { countryCode, businessUnit, locales[], buCombined[], runName }
Fetches CSV from PH Pages API → creates scans → queues run.
            `,

            listRuns: `
GET /runs
Returns all runs sorted newest-first.
            `,

            getRun: `
GET /runs/:id
Returns run metadata + latest scans for each original scan group.
            `,

            stream: `
GET /runs/:id/stream
SSE stream:
  - scan-start
  - step-start
  - step-complete
  - scan-complete
  - scan-failed
  - run-complete
            `,

            rescan: `
POST /runs/:id/rescan
Body: { scanIds: [] }
Creates new scans with parentScanId set to original scans.
            `,

            rerun: `
POST /runs/:id/rerun
Duplicates all original scans to create a new generation.
            `,

            addScans: `
POST /runs/:id/scans
Body: { scans: [ {urlOld,urlNew,metadata,checkConfig}, ... ] }
Adds more scans to an existing run.
            `,

            updateScan: `
PATCH /runs/:runId/scans/:scanId
Updates urlOld/urlNew/metadata/checkConfig.
Does not trigger rescan automatically.
            `,

            deleteScans: `
DELETE /runs/:id/scans
Soft delete: sets deleted=true. Counters recomputed.
            `,

            debugTextComparison: `
POST /debug/text-excludes
DEV ONLY. Runs Step 1–3 on a page and returns diagnostic info.
            `
        }
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////////// 11. RESCANS & RERUNS //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    rescansAndReruns: {

        meaning: `
        Rescan = retry selected scans.
        Rerun  = regenerate a new generation of all original scans.
    `,

        generationLogic: {
            parentScanId: `
            original scan → parentScanId=null
            rescan/ rerun → parentScanId=originalScanId
        `,
            latestGeneration: `
            scanLatest.service.js identifies latest per parent group
            using createdAt timestamp ordering.
        `
        },

        runCompletionBehavior: `
        A run becomes completed only when all original scan groups
        have a latest scan that is either completed or failed.
    `
    },

///////////////////////////////////////////////////////////////////////////////
///////////////////////////// 12. COUNTER LOGIC ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    counterLogic: {

        computeLatestCounters:
            "services/scanLatest.service.js determines latest generation",

        definition: `
        totalScans    = number of original (parentScanId=null AND deleted=false)
        completedScans = number of original groups whose latest scan completed
        failedScans    = number of original groups whose latest scan failed
    `,

        effects: `
        - Soft deleting a parent-scope scan reduces totalScans.
        - Rescans replace older generations for reporting purposes.
        - A run completes when completedScans + failedScans == totalScans.
    `
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////////// 13. ENVIRONMENT VARIABLES //////////////////////////
///////////////////////////////////////////////////////////////////////////////

    env: {
        PORT: "5177",
        MONGO_URI: "mongodb://mongo:27017/mqc2",
        SCAN_CONCURRENCY: "Recommended: 1–2 locally.",
        PH_PAGES_BASE_URL: "Used for /runs/fetch flows.",
        NODE_ENV: "development",
        CHECK_TIMEOUT_MS: "Optional global timeout per pipeline step"
    },

///////////////////////////////////////////////////////////////////////////////
//////////////////////////// 14. SYSTEM BEHAVIOR //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    systemBehavior: {

        cachingRules: `
        screenshot filenames use hash(originalUrl)
        noCacheUrl ensures fresh loads for Playwright
        prevents screenshot duplication explosion
    `,

        performanceNotes: `
        Phase 1 concurrency: fastQueue (~15)
        Phase 2 concurrency: slowQueue (~2)
        SSE streaming for 500+ scans remains stable
        CSV bulk uploads should paginate in frontend
        SSE requires frontend to stay connected during large runs
    `,

        safetyNotes: `
        - Fail-fast prevents wasted work
        - All errors produce row-error + row-final + row-done
        - pageDataCheck fail-fast prevents expensive checks on broken URLs
        - Any step failure marks scan failed and stops pipeline
        - Run counters automatically recalc after every scan
    `
    },

///////////////////////////////////////////////////////////////////////////////
////////////////////////////// 15. CURRENT STATUS /////////////////////////////
///////////////////////////////////////////////////////////////////////////////

    currentStatus: {
        completedCore: [
            "New SEO rule engine with preferred=false inversion logic",
            "New verdict model (equal/improved/regression/neutral)",
            "New passOld/passNew system",
            "Neutral handling",
            "Character-based rules",
            "URL slug parsing improvements",
            "UTF-8 compliance rule",
            "Canonical normalization (ignore trailing slashes)",
            "Robots-index staging logic",
            "Complete uniformity across all rule implementations",
            "Runs + Scans data model",
            "Shared browser instance",
            "Run + Scan queues",
            "Pipeline registry + orchestration",
            "Rescan + Rerun engine",
            "CRUD on scans",
            "Stable no-cache handling",
            "SSE real-time streaming",
            "Visual screenshot engine (desktop + mobile)",
            "Latest-generation scan logic",
            "Text comparison: Step 1 excludes",
            "Text comparison: Step 2 visibility filtering",
            "Text comparison: Step 3 block extraction",
            "Text comparison: Step 4 block diff",
            "Text comparison: Step 6 word-level diff (85 percent)",
            "Text comparison: Step 7 content parity (word-based)",
            "Unified equal/missing/added model for text comparison",
            "Unified SSE events with row-final",
            "Two-phase barrier pipeline",
            "One lightweight HTML fetch per URL",
            "Playwright HTML override",
            "Centralized normalization of scan results",
            "Strict Phase 1 fail-fast logic",
        ],

        plannedNext: [
            "OpenGraph rule set",
            "Twitter card rule set",
            "Schema.org rule set",
            "Full canonical chain extraction",
            "More metadata robust parsing",
            "Enhanced mobile screenshot workflow",
            "Rewriting htmlCheck with DOM mapping",
            "Image heuristics",
            "Link validation improvements",
            "Lighthouse integration",
            "Configurable run profiles (Lite / Full / Visual only)",
            "Step 8 translation (optional future)",
            "Step 9 visual highlight overlay (optional future)",

        ]
    }

};
