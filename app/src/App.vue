<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import l2l from './assets/l2l.png'
import philips from './assets/philips.svg'
import ModeSelector from './components/ModeSelector.vue'
import SingleInputs from './components/SingleInputs.vue'
import FetchInputs from './components/FetchInputs.vue'
import TogglesPanel from "./components/TogglesPanel.vue";
import ResultsPanel from "./components/Results/ResultsPanel.vue";
import CompareModal from "./components/CompareModal.vue";

/* --------------------------------- utils --------------------------------- */
const API_BASE = '/console/ph-pse/mqc/api';

const RAW_LT =
    (import.meta.env.VITE_LIBRETRANSLATE_ENDPOINT &&
        import.meta.env.VITE_LIBRETRANSLATE_ENDPOINT.replace(/\/+$/, '')) ||
    '/libretranslate';
const LT_ENDPOINT = /\/translate\/?$/.test(RAW_LT) ? RAW_LT : `${RAW_LT}/translate`;

// Stream endpoints (allow override via env, otherwise derive from API_BASE)
const SSE_SINGLE = `${API_BASE}/runs/single`;
const SSE_BULK   = `${API_BASE}/runs/bulk`;
const SSE_FETCH   = `${API_BASE}/runs/fetch`;

function publicUrl(p) {
  if (!p) return null;

  // absolute http(s)
  if (/^https?:\/\//i.test(p)) return p;

  // Already fully prefixed -> do NOT modify again
  if (p.startsWith(API_BASE)) return p;

  // Backend returns "/api/tmp/xxxx.png"
  if (p.startsWith("/api/")) {
    return API_BASE + p.substring(4); // remove leading "/api"
  }

  // Backend sometimes returns "/tmp/xxxx.png"
  if (p.startsWith("/tmp/")) {
    return API_BASE + p;
  }

  // fallback for any other relative path
  return API_BASE + "/" + p.replace(/^\//, "");
}

function buildCheckConfig() {
  return {
    text: toggles.value['text-comparison'],
    links: toggles.value['link-checker'],
    seo: toggles.value['seo'],
    visualComparisonDesktop: toggles.value['screenshot-desktop'],
    screenshotMobile: toggles.value['screenshot-mobile']
  };
}

const num = (v) => Number.isFinite(v) ? Math.round(v) : (v ?? null)
const clampPct = v => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null; };
const normPct = v => { if (v == null) return null; const n = Number(v); if (!Number.isFinite(n)) return null; return Math.round(n <= 1 ? n * 100 : n); };

/* robustly extract old/new URLs from any event shape */
function extractPair(payload = {}) {
  const p = payload || {}
  const oldU = p.aemUrl ?? p.oldUrl ?? p.left?.url ?? p.aem?.url ?? p.aem ?? p.pair?.aemUrl ?? p.pair?.oldUrl ?? p.urls?.old ?? p.sourceUrl ?? p.from ?? null
  const newU = p.contentstackUrl ?? p.newUrl ?? p.right?.url ?? p.contentstack?.url ?? p.contentstack ?? p.pair?.contentstackUrl ?? p.pair?.newUrl ?? p.urls?.new ?? p.targetUrl ?? p.to ?? null
  return { oldU, newU }
}

/* --- URL validation --- */
const tidy = (v='') => String(v || '').trim();
function isValidHttpUrl(v) {
  try {
    const u = new URL(tidy(v));
    return ['http:', 'https:'].includes(u.protocol) && !!u.hostname;
  } catch { return false; }
}

const oldUrlInvalid = computed(() => !!oldUrl.value && !isValidHttpUrl(oldUrl.value));
const newUrlInvalid = computed(() => !!newUrl.value && !isValidHttpUrl(newUrl.value));

const canAnalyze = computed(() => {
  if (runMode.value === "single") {
    return isValidHttpUrl(oldUrl.value) && isValidHttpUrl(newUrl.value);
  }
  if (runMode.value === "bulk") {
    return !!csvFile.value;
  }
  if (runMode.value === "fetch") {
    return fetchCountry.value.trim().length > 0 && fetchBU.value.trim().length > 0;
  }
  return false;
});

/* --------------------------- run mode + inputs --------------------------- */
const CK = {
  toggles:  'mqc_toggles',
  oldUrl:   'mqc_oldUrl',
  newUrl:   'mqc_newUrl',
  mode:     'mqc_mode',
  excludes: 'mqc_excludes',
};
const runMode = ref('single') // 'single' | 'bulk' | 'fetch'
const setMode = (m) => { runMode.value = m; error.value=''; }
const oldUrl = ref('https://www.philips.com/content/B2C/en_IE/support-home.html')
const newUrl = ref('https://www.philips.ie/c-s/support')
const onSegKey = (e) => {
  if (e.key === 'ArrowLeft') {
    if (runMode.value === 'fetch') setMode('bulk')
    else if (runMode.value === 'bulk') setMode('single')
  } else if (e.key === 'ArrowRight') {
    if (runMode.value === 'single') setMode('bulk')
    else if (runMode.value === 'bulk') setMode('fetch')
  }
}
const csvFile = ref(null)
const csvFileName = computed(() => csvFile.value?.name || '')
const fileInput = ref(null)
const isDragging = ref(false)
const onCsvChange = (e) => {
  const f = e.target.files?.[0] || null
  if (!f) { csvFile.value = null; return }
  if (!/\.csv$/i.test(f.name)) { alert('Please select a .csv file'); return }
  csvFile.value = f
}
const fetchCountry = ref("");
const fetchBU = ref("");
const fetchRunName = ref("");

const openFilePicker = () => fileInput.value?.click()
const onDragOver = (e) => { e.preventDefault(); isDragging.value = true }
const onDragLeave = () => { isDragging.value = false }
const onDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  if (!/\.csv$/i.test(f.name)) { alert('Please drop a .csv file'); return }
  csvFile.value = f
}

onMounted(() => {
  const p = new URLSearchParams(window.location.search)
  const o = p.get('old'); const n = p.get('new')
  if (o) oldUrl.value = o
  if (n) newUrl.value = n
})

/* --------------------------------- state -------------------------------- */
const loading = ref(false)
const shotsLoading = ref(false)
const report = ref(null)        // single-mode report
const error = ref('')

/* bulk mode: rows keyed by rowIndex (string) */
const bulk = ref({ rows: {}, order: [] }) // order = array of keys to keep stable ordering
const bulkOrder = computed(() =>
    bulk.value.order
        .slice()
        .sort((a, b) => (bulk.value.rows[a]?.index ?? 0) - (bulk.value.rows[b]?.index ?? 0))
)

/* -------------------------------- toggles ------------------------------- */
const CHECK_DEFS = [
  { key: 'screenshot-desktop', label: 'Desktop Screenshot' },
  { key: 'screenshot-mobile', label: 'Mobile Screenshot' },
  { key: 'text-comparison',    label: 'Text Comparison' },
  // { key: 'translation',        label: 'Translation Checker' },
  { key: 'link-checker',       label: 'Link Checker' },
  // { key: 'seo',                label: 'SEO' },
  // { key: 'analytics-tracking', label: 'Analytics & Tracking' },
  // { key: 'performance',        label: 'Performance' },
  // { key: 'best-practices',     label: 'Best Practices' },
  // { key: 'accessibility',      label: 'Accessibility' },
]
const toggles = ref({
  'screenshot-desktop': true,
  'screenshot-mobile':  false,
  'text-comparison':    true,
  'translation':        false,
  'link-checker':       true,
  // 'seo':                false,
  // 'analytics-tracking': false,
  // 'performance':        false,
  // 'best-practices':     false,
  // 'accessibility':      false,
})
const selectedChecks = computed(() => {
  const base = CHECK_DEFS.filter(d => !!toggles.value[d.key]).map(d => d.key)
  if (toggles.value['seo']) base.push('seo-rules')
  return Array.from(new Set(base))
})

watch(
    () => toggles.value,
    (v) => {
      localStorage.setItem(CK.toggles, JSON.stringify(v));
    },
    { deep: true }
);

/* ------------------------------ gauge stuff ----------------------------- */
const gaugeOrder = [
  { key: 'text-comparison', label: 'Content Parity',  short: 'Content' },
  { key: 'seo',             label: 'SEO',             short: 'SEO'     },
  { key: 'performance',     label: 'Performance',     short: 'Performance' },
  { key: 'best-practices',  label: 'Best Practices',  short: 'BP'      },
  { key: 'accessibility',   label: 'Accessibility',   short: 'Accessibility' },
]
const visibleGauges = computed(() => gaugeOrder.filter(g => toggles.value[g.key]))
const gaugeCols = computed(() => `repeat(${Math.max(1, visibleGauges.value.length)}, minmax(0, 1fr))`)

function scoreBadgeClass(p){
  const n = Number(p)
  if (!Number.isFinite(n)) return 'badge badge--neutral'
  if (n >= 90) return 'badge badge--ok'
  if (n >= 50) return 'badge badge--neutral'
  return 'badge badge--bad'
}

const flags = ref({
  text:false, translation:false, seo:false, seoRules:false,
  performance:false, bestPractices:false, accessibility:false, linkChecker:false,
})

/* ------------------------- per-row (bulk) helpers ------------------------ */
const emptyFlags = () => ({
  text:false, translation:false, seo:false, seoRules:false,
  performance:false, bestPractices:false, accessibility:false, linkChecker:false,
})
function emptyVm(){
  return {
    oldUrl: '', newUrl: '',
    overallScore: null,
    shotsLoading: true,
    mobileLoading: false,
    content: { textCoveragePct: 0, textDiff: [] },
    screenshots: {
      oldPngPath: null,
      newPngPath: null,
      oldMobilePngPath: null,
      newMobilePngPath: null },
    title: { old: '—', new: '—', equal: false },
    metaDescription: { old: '—', new: '—', equal: false },
    h1: { old: '—', new: '—', equal: false },
    pathMatch: false,
    seo: { old:{ score:null, metrics:{} }, new:{ score:null, metrics:{} }, delta:0, rules:[] },
    seoRules: [],
    performance: {
      psi: null,
      lighthouse: { old:{ metrics:{} }, new:{ metrics:{} } },
      opportunities: { old:[], new:[] },
      summary: { comparable:false, scoreDelta:null }
    },
    a11y: {
      old: { score:null, counts:{ unknown:null }, violations:[], failures:[] },
      new: { score:null, counts:{ unknown:null }, violations:[], failures:[] },
      delta: null
    },
    bestPractices: { old:{ score:null }, new:{ score:null }, delta:0, data: null },
    linkChecker: { data: null }
  }
}
function ensureBulkRow(rawRowIndex, meta = {}) {
  const key = String(rawRowIndex);

  // Assign a sequential UI index
  const uiIndex = bulk.value.order.length;

  if (!bulk.value.rows[key]) {
    bulk.value.rows[key] = {
      index: uiIndex,       // NOT Number(rawRowIndex)
      key,
      report: emptyVm(),
      flags: emptyFlags(),
      shotsLoading: true,
      error: ''
    };

    bulk.value.order.push(key);
  }

  const r = bulk.value.rows[key];

  if (meta.oldUrl) r.report.oldUrl = meta.oldUrl;
  if (meta.newUrl) r.report.newUrl = meta.newUrl;

  return r;
}
function isRowGaugeLoading(key, r){
  if (key === 'text-comparison') return !r.flags.text
  if (key === 'seo')             return !r.flags.seo
  if (key === 'performance')     return !r.flags.performance
  if (key === 'best-practices')  return !r.flags.bestPractices
  if (key === 'accessibility')   return !r.flags.accessibility
  return false
}

/* ----------------------- patchers (single + bulk) ------------------------ */
function applyPartialTo(target, key, data, perRowState) {
  const T = target;
  const F = perRowState?.flags ?? flags.value;

  switch (key) {

      /* --------------------- PAGE DATA CHECK --------------------- */
    case "pageDataCheck": {
      const pd = data || {};

      // 1. Normalize URLs
      if (pd.urlOld) {
        T.oldUrl = pd.urlOld.originalUrl || pd.urlOld.url || T.oldUrl;
        T.urlOld = {
          originalUrl: pd.urlOld.originalUrl,
          noCacheUrl: pd.urlOld.noCacheUrl,
          httpStatus: pd.urlOld.httpStatus,
          httpStatusText: pd.urlOld.httpStatusText,
          platform: pd.urlOld.platform,
          durationMs: pd.urlOld.durationMs,
          error: pd.urlOld.error
        };
      }

      if (pd.urlNew) {
        T.newUrl = pd.urlNew.originalUrl || pd.urlNew.url || T.newUrl;
        T.urlNew = {
          originalUrl: pd.urlNew.originalUrl,
          noCacheUrl: pd.urlNew.noCacheUrl,
          httpStatus: pd.urlNew.httpStatus,
          httpStatusText: pd.urlNew.httpStatusText,
          platform: pd.urlNew.platform,
          durationMs: pd.urlNew.durationMs,
          error: pd.urlNew.error,
          locale: pd.urlNew.locale,
          languageCode: pd.urlNew.languageCode,
          countryCode: pd.urlNew.countryCode,
          country: pd.urlNew.country,
          language: pd.urlNew.language
        };
      }

      // 2. Metadata (classic MQC1 fields)
      if (pd.title) {
        T.title = {
          old: pd.title.old ?? "—",
          new: pd.title.new ?? "—",
          equal: pd.title.equal ?? false
        };
      }

      if (pd.description) {
        T.metaDescription = {
          old: pd.description.old ?? "—",
          new: pd.description.new ?? "—",
          equal: pd.description.equal ?? false
        };
      }

      if (pd.h1) {
        T.h1 = {
          old: pd.h1.old ?? "—",
          new: pd.h1.new ?? "—",
          equal: pd.h1.equal ?? false
        };
      }

      // 3. Page matching
      if (typeof pd.pathMatch !== "undefined") {
        T.pathMatch = pd.pathMatch;
      }

      // 4. Page classification
      if (pd.pageType) {
        T.pageType = pd.pageType;
      }
      if (pd.template) {
        T.template = pd.template;
      }

      // 5. Stop flag (e.g. newUrl 404)
      if (pd.shouldContinue === false) {
        T.shouldContinue = false;
      }

      // All good
      break;
    }

      /* --------------------- TEXT COMPARISON --------------------- */
    case 'text-comparison': {
      const tc = data || {};

      // MQC2 canonical format
      let ops = [];
      if (Array.isArray(tc.ops)) {
        ops = tc.ops;
      } else if (Array.isArray(tc.diff?.ops)) {
        ops = tc.diff.ops;
      } else if (Array.isArray(tc.equals) || Array.isArray(tc.missing) || Array.isArray(tc.added)) {
        // Legacy fallback
        ops = [];
      }

      T.content.textDiff = ops;

      const sim = tc.contentParity?.score ?? 0;
      T.content.textCoveragePct = Math.round(sim * 100);

      F.text = true;
      break;
    }

      /* ------------------------- LINKS --------------------------- */
    case 'link-checker': {
      const lc = data || {}

      T.linkChecker.data = {
        aem: lc.old || {},
        contentstack: lc.new || {},
        summary: lc.summary || null
      }

      F.linkChecker = true
      break
    }

      /* -------------------------- SEO ---------------------------- */
    case 'seo': {
      const seo = data || {}

      T.seoRules = seo.rules || []

      const summary = seo.summary || {}
      T.seo.old = { score: summary.oldScore ?? null }
      T.seo.new = { score: summary.newScore ?? null }
      T.seo.delta = summary.delta ?? 0

      F.seo = true
      F.seoRules = true
      break
    }

      /* ----------------------- SCREENSHOTS ------------------------ */
    case 'screenshot':
    case 'visualComparisonDesktop':
    case 'visual-comparison-desktop': {
      const sc = data || {};

      T.screenshots.oldPngPath = publicUrl(sc.aem?.imagePath);
      T.screenshots.newPngPath = publicUrl(sc.contentstack?.imagePath);

      if (perRowState) perRowState.shotsLoading = false;
      else shotsLoading.value = false;

      break;
    }

    case 'screenshot-mobile': {
      console.log('[applyPartialTo] screenshot-mobile payload:', data);

      const mobilePath =
          data?.contentstackMobile?.imagePath ||
          data?.contentstack?.imagePath ||
          null;

      if (mobilePath) {
        T.screenshots.newMobilePngPath = publicUrl(mobilePath);
        T.mobileLoading = false;
        console.log(
            '[applyPartialTo] set newMobilePngPath =',
            T.screenshots.newMobilePngPath
        );
      } else {
        console.log('[applyPartialTo] screenshot-mobile: NO mobilePath');
      }
      break;
    }

    default:
      console.log("Unhandled SSE key:", key, data)
      break
  }
}

const applyPartialSingle = (key, data) => {
  if (!report.value) report.value = emptyVm();
  applyPartialTo(report.value, key, data, null);
  report.value.flags = flags.value;
};

const applyPartialRow = (rowKey, key, data) => {
  const row = bulk.value.rows[String(rowKey)]
  if (!row) return
  applyPartialTo(row.report, key, data, row)
}

function sanitizeToggles(obj) {
  const base = { ...toggles.value };
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(base)) if (k in obj) base[k] = !!obj[k];
  }
  return base;
}

onMounted(() => {
  const savedMode = localStorage.getItem(CK.mode);
  if (['single', 'bulk', 'fetch'].includes(savedMode)) {
    runMode.value = savedMode;
  }

  const savedToggles = localStorage.getItem(CK.toggles)
  if (savedToggles) {
    try {
      toggles.value = sanitizeToggles(JSON.parse(savedToggles))
    } catch {}
  }

  const savedOld = localStorage.getItem(CK.oldUrl);
  if (!oldUrl.value && savedOld) oldUrl.value = savedOld;

  const savedNew = localStorage.getItem(CK.newUrl);
  if (!newUrl.value && savedNew) newUrl.value = savedNew;

  const savedExcludes = localStorage.getItem(CK.excludes);
  if (savedExcludes != null) excludes.value = savedExcludes;
});

/* ----------------------------- streaming I/O ----------------------------- */
async function runCompare() {
  error.value = '';
  loading.value = true;

  if (runMode.value === 'single') {
    report.value = {
      ...emptyVm(),
      flags: flags.value,
    };

    report.value.oldUrl = oldUrl.value.trim();
    report.value.newUrl = newUrl.value.trim();

    // desktop loader
    shotsLoading.value = true;

    // mobile loader only if mobile toggle is on
    report.value.mobileLoading = !!toggles.value['screenshot-mobile'];
  }

  if (runMode.value === 'bulk') {
    return runBulkCompare();
  }

  if (runMode.value === 'fetch') {
    return runFetchCompare();
  }

  // --- SINGLE MODE ----
  report.value = emptyVm();
  report.value.oldUrl = oldUrl.value.trim();
  report.value.newUrl = newUrl.value.trim();
  flags.value = emptyFlags();

  report.value.mobileLoading = true;
  report.value.shotsLoading = true;

  const checkConfig = buildCheckConfig();

  async function streamRun(runId) {
    const sseRes = await fetch(`${API_BASE}/runs/${runId}/stream`, {
      headers: { Accept: "text/event-stream" }
    });

    if (!sseRes.ok) {
      error.value = "Failed to open results stream.";
      return;
    }

    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let runCompleted = false;

    const flush = (chunk) => {
      buffer += chunk;
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const raw of parts) {
        if (!raw.trim()) continue;

        let event = "message";
        let dataStr = "";

        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) dataStr += line.slice(5).trim();
        }

        if (!dataStr) continue;

        let payload;
        try { payload = JSON.parse(dataStr); }
        catch { continue; }

        /* -------------------------
           GLOBAL STOP CONDITION
        ------------------------- */
        if (event === "run-complete") {
          runCompleted = true;
          return;
        }

        /* -------------------------
           SINGLE MODE
        ------------------------- */
        if (runMode.value === "single") {
          const key = payload.key || payload.step || payload.type;
          const data = payload.data;

          switch (key) {
            case "text":
            case "text-comparison":
              applyPartialSingle("text-comparison", data);
              break;

            case "link-checker":
            case "links":
              applyPartialSingle("link-checker", data);
              break;

            case "seo":
              applyPartialSingle("seo", data);
              break;

            case "visualComparisonDesktop":
            case "screenshot":
              applyPartialSingle("screenshot", data);
              break;

            case "screenshot-mobile":
              applyPartialSingle("screenshot-mobile", data);
              break;
          }

          continue;
        }

        /* -------------------------
           BULK + FETCH MODE
        ------------------------- */

        if (event === "row-init") {
          const { rowIndex, oldUrl, newUrl } = payload;
          ensureBulkRow(rowIndex, { oldUrl, newUrl });
          continue;
        }

        if (event === "row-result") {
          const { rowIndex, key, data } = payload;

          if (key === "pageDataCheck") {
            const row = ensureBulkRow(rowIndex);
            const R = row.report;
            const d = data || {};

            // -----------------------------
            // 1. URL normalization
            // -----------------------------
            if (d.urlOld) {
              R.oldUrl = d.urlOld.originalUrl || d.urlOld.url || R.oldUrl;
              R.urlOld = {
                originalUrl: d.urlOld.originalUrl,
                noCacheUrl: d.urlOld.noCacheUrl,
                httpStatus: d.urlOld.httpStatus,
                httpStatusText: d.urlOld.httpStatusText,
                platform: d.urlOld.platform,
                durationMs: d.urlOld.durationMs,
                error: d.urlOld.error
              };
            }

            if (d.urlNew) {
              R.newUrl = d.urlNew.originalUrl || d.urlNew.url || R.newUrl;
              R.urlNew = {
                originalUrl: d.urlNew.originalUrl,
                noCacheUrl: d.urlNew.noCacheUrl,
                httpStatus: d.urlNew.httpStatus,
                httpStatusText: d.urlNew.httpStatusText,
                platform: d.urlNew.platform,
                durationMs: d.urlNew.durationMs,
                error: d.urlNew.error,
                locale: d.urlNew.locale,
                languageCode: d.urlNew.languageCode,
                countryCode: d.urlNew.countryCode,
                country: d.urlNew.country,
                language: d.urlNew.language
              };
            }

            // -----------------------------
            // 2. Titles / descriptions / H1
            // -----------------------------
            if (d.title) {
              R.title = {
                old: d.title.old ?? "—",
                new: d.title.new ?? "—",
                equal: d.title.equal ?? false
              };
            }

            if (d.description) {
              R.metaDescription = {
                old: d.description.old ?? "—",
                new: d.description.new ?? "—",
                equal: d.description.equal ?? false
              };
            }

            if (d.h1) {
              R.h1 = {
                old: d.h1.old ?? "—",
                new: d.h1.new ?? "—",
                equal: d.h1.equal ?? false
              };
            }

            // -----------------------------
            // 3. Path / Template / Type
            // -----------------------------
            if (typeof d.pathMatch !== "undefined") {
              R.pathMatch = d.pathMatch;
            }

            if (d.pageType) {
              R.pageType = d.pageType;
            }

            if (d.template) {
              R.template = d.template;
            }

            // -----------------------------
            // 4. Should Continue Flag
            // -----------------------------
            if (d.shouldContinue === false) {
              R.shouldContinue = false;
            }

            continue;
          }

          applyPartialRow(rowIndex, key, data);
          continue;
        }

        if (event === "row-error") {
          const { rowIndex, error: errMsg } = payload;
          const row = ensureBulkRow(rowIndex);
          row.error = errMsg;
          continue;
        }
      }
    };

    // STREAM LOOP
    while (!runCompleted) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) flush(decoder.decode(value, { stream: true }));
    }
  }


  async function runBulkCompare() {
    error.value = "";
    loading.value = true;

    if (!csvFile.value) {
      error.value = "Please upload a CSV first.";
      loading.value = false;
      return;
    }

    const form = new FormData();
    form.append("file", csvFile.value);
    form.append("checkConfig", JSON.stringify(buildCheckConfig()));

    // STEP 1: Create run
    const createRes = await fetch(SSE_BULK, {
      method: "POST",
      body: form
    });

    if (!createRes.ok) {
      error.value = await createRes.text();
      loading.value = false;
      return;
    }

    const { runId } = await createRes.json();

    // STEP 2: Open the SSE stream
    await streamRun(runId);

    loading.value = false;
  }

  async function runFetchCompare() {
    error.value = "";
    loading.value = true;

    const payload = {
      countryCode: fetchCountry.value.trim(),
      businessUnit: fetchBU.value.trim(),
      runName: fetchRunName.value.trim() || null,
      checkConfig: JSON.stringify(buildCheckConfig())
    };

    // STEP 1: Create run
    const createRes = await fetch(SSE_FETCH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!createRes.ok) {
      error.value = await createRes.text();
      loading.value = false;
      return;
    }

    const { runId } = await createRes.json();

    // STEP 2: Open the SSE stream
    await streamRun(runId);

    loading.value = false;
  }

  // 1. Create run
  const createRes = await fetch(SSE_SINGLE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urlOld: report.value.oldUrl,
      urlNew: report.value.newUrl,
      checkConfig
    })
  });

  if (!createRes.ok) {
    error.value = await createRes.text();
    loading.value = false;
    return;
  }

  const { runId } = await createRes.json();

  // 2. SSE
  const sseRes = await fetch(`${API_BASE}/runs/${runId}/stream`, {
    headers: { Accept: 'text/event-stream' }
  });

  const reader = sseRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let runCompleted = false;
  let gotAnyEvent = false;

  const timeout = setTimeout(() => {
    if (!gotAnyEvent) runCompleted = true;
  }, 2000);

  const flush = (chunk) => {
    buffer += chunk;
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const raw of parts) {
      if (!raw.trim()) continue;

      gotAnyEvent = true;
      const lines = raw.split('\n');
      let event = 'message';
      let dataRaw = '';

      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) dataRaw += line.slice(5).trim();
      }

      if (!dataRaw) continue;

      let payload;
      try { payload = JSON.parse(dataRaw); } catch { continue; }

      if (event === 'run-complete' || event === 'done' || event === 'complete') {
        runCompleted = true;

        loading.value = false;

        continue;
      }

      if (event === 'row-result' || event === 'step-result' || event === 'result') {
        const key  = payload.key || payload.step || payload.type;
        const data = payload.data;

        if (!key) return;

        switch (key) {
          case 'text-comparison':
          case 'text':
            applyPartialSingle('text-comparison', data);
            break;

          case 'link-checker':
          case 'links':
            applyPartialSingle('link-checker', data);
            break;

          case 'screenshot':
          case 'visualComparisonDesktop':
          case 'visual-comparison-desktop':
            applyPartialSingle('screenshot', data);
            break;

          case 'screenshot-mobile':
          case 'mobile-screenshot':
          case 'screenshotMobile':
            applyPartialSingle('screenshot-mobile', data);
            break;

          case 'seo':
            applyPartialSingle('seo', data);
            break;

          case 'seo-rules':
            applyPartialSingle('seo-rules', data);
            break;

          default:
            console.log('[SSE] unhandled key', key, data);
            break;
        }
      }
    }
  };

  while (!runCompleted) {
    const { value, done } = await reader.read();

    // Never break early
    if (done) continue;

    if (value) {
      flush(decoder.decode(value, { stream: true }));
    }
  }

  clearTimeout(timeout);

  // FINALIZE
  loading.value = false;
  result.shotsLoading.value = false;
}

/* --------------------------- bulk missing checks --------------------------- */
function missingChecksForRow(row){
  const present = row.flags
  return selectedChecks.value.filter(k => {
    if (k === 'seo-rules') return !present.seoRules
    if (k === 'text-comparison') return !present.text
    if (k === 'link-checker') return !present.linkChecker
    if (k === 'seo') return !present.seo
    if (k === 'performance') return !present.performance
    if (k === 'best-practices') return !present.bestPractices
    if (k === 'accessibility') return !present.accessibility
    if (k === 'screenshot-desktop' || k === 'screenshot-mobile') return row.result.shotsLoading
    return false
  })
}

async function retryRow(row, checks, attempt = 1){
  if (!checks.length) return
  const maxAttempts = 2
  const backoffMs = attempt === 1 ? 500 : 1500

  await new Promise(r => setTimeout(r, backoffMs))

  const body = {
    aemUrl: row.report.oldUrl,
    contentstackUrl: row.report.newUrl,
    checks,
    options: { lighthouse: { formFactor: 'mobile', concurrency: 1 } }
  }

  const res = await fetch(SSE_SINGLE, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Accept':'text/event-stream' },
    body: JSON.stringify(body)
  })

  if (!res.ok) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const rowKey = row.key

  const flushRetry = (chunk) => {
    buffer += chunk
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      if (!part.trim()) continue
      let event = 'message'
      let dataStr = ''
      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
      }
      if (!dataStr) continue

      let payload = null
      try { payload = JSON.parse(dataStr) } catch { continue }

      if (event === 'result' || event === 'row-result') {
        const key = payload.key || payload.type || payload.check
        const data = payload.data ?? payload.payload
        if (key) applyPartialRow(rowKey, key, data)
      }
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    flushRetry(decoder.decode(value, { stream: true }))
  }

  const stillMissing = missingChecksForRow(bulk.value.rows[rowKey])
  if (stillMissing.length && attempt < maxAttempts) {
    return retryRow(row, stillMissing, attempt + 1)
  }
}

async function retryMissingAfterBulk(){
  const rows = bulkOrder.value.map(key => bulk.value.rows[key])
  for (const r of rows) {
    const missing = missingChecksForRow(r)
    if (missing.length) retryRow(r, missing)
  }
}

const results = computed(() => {
  if (runMode.value === 'single' && report.value) {
    return [
      {
        ...report.value,
        flags: report.value.flags || flags.value || emptyFlags()
      }
    ];
  }

  if (runMode.value === 'bulk') {
    return bulkOrder.value.map(k => {
      const row = bulk.value.rows[k];
      return {
        ...row.report,
        flags: row.flags || emptyFlags()
      };
    });
  }

  if (runMode.value === 'fetch') {
    return bulkOrder.value.map(k => {
      const row = bulk.value.rows[k];
      return {
        ...row.report,
        flags: row.flags || emptyFlags()
      };
    });
  }

  return [];
});

function computeGauges(result) {
  return {
    'text-comparison': result.flags?.text ? clampPct(result.content?.textCoveragePct) : null,
    'seo': result.flags?.seo ? clampPct(normPct(result.seo?.new?.score)) : null,
    'performance': result.flags?.performance ? clampPct(normPct(result.performance?.psi?.new)) : null,
    'best-practices': result.flags?.bestPractices ? clampPct(normPct(result.bestPractices?.new?.score)) : null,
    'accessibility': result.flags?.accessibility ? clampPct(result.a11y?.new?.score) : null
  };
}

const flagsFor = r => r.flags;
const bpDataFor = r => r.bestPractices?.data;
const bpLoadingFor = r => !bpDataFor(r);
const linkDataFor = r => r.linkChecker?.data;
const linkLoadingFor = r => !linkDataFor(r);
const seoRowsFor = r => r.seoRules || [];

function gaugeLoadingFor(result, key) {
  return isRowGaugeLoading(key, result);
}

const compareOpen = ref(false)
const compareOld = ref(null)
const compareNew = ref(null)

function openCompare(payload) {
  console.log('[App] compare event received', payload)

  compareOld.value = payload.old
  compareNew.value = payload.new
  compareOpen.value = true

  console.log('[App] compareOpen now =', compareOpen.value)
}

watch(runMode, (v) => {
  localStorage.setItem(CK.mode, v);
});
</script>

<template>
  <main class="page">
    <header class="page__header">
      <div class="logos">
        <img :src="philips" alt="" class="logo" />
        <span class="slash muted" aria-hidden="true">//</span>
        <img :src="l2l" alt="" class="logo" />
      </div>
      <h1>L2L MQC <span class="muted">— Migration Quality Checker</span></h1>
      <p class="muted sub-title">Compare production vs migrated pages, side-by-side.</p>
    </header>

    <ModeSelector
        v-model="runMode"
        @keydown="onSegKey"
    />

    <!-- Controls -->
    <section class="card">
      <!-- Inputs depend on mode -->
      <SingleInputs
          v-if="runMode==='single'"
          :oldUrl="oldUrl"
          :newUrl="newUrl"
          :oldUrlInvalid="oldUrlInvalid"
          :newUrlInvalid="newUrlInvalid"
          @update:oldUrl="oldUrl = $event"
          @update:newUrl="newUrl = $event"
      />

      <FetchInputs
          v-if="runMode==='fetch'"
          v-model:country="fetchCountry"
          v-model:bu="fetchBU"
          v-model:runName="fetchRunName"
      />

      <div v-if="runMode==='bulk'" class="field">
        <label>CSV file</label>

        <!-- Hidden native input (keeps keyboard + screen-reader support) -->
        <input
            ref="fileInput"
            type="file"
            accept=".csv"
            @change="onCsvChange"
            style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; padding:0; margin:-1px;"
        />

        <!-- Dropzone -->
        <div
            class="dropzone"
            :class="{ 'is-dragging': isDragging }"
            role="button"
            tabindex="0"
            aria-label="Upload CSV: drag and drop or click to browse"
            @click="openFilePicker"
            @keydown.enter.prevent="openFilePicker"
            @keydown.space.prevent="openFilePicker"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
        >
          <div class="dz-title">Drag & Drop your CSV here</div>
          <div class="dz-sub">or click to browse files</div>
          <button type="button" class="browse-btn" @click.stop="openFilePicker">Browse Files</button>
          <div v-if="csvFileName" class="dz-file mono">{{ csvFileName }}</div>
        </div>
      </div>

      <div class="controls-bar">
        <TogglesPanel
            :checkDefs="CHECK_DEFS"
            v-model:toggles="toggles"
        />

        <div class="controls-cta">
          <button class="main-cta" :disabled="loading || !canAnalyze" @click="runCompare">
            <span v-if="loading">Analyzing…</span>
            <span v-else>Analyze</span>
          </button>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <!-- Results: SINGLE -->
    <ResultsPanel
        :results="results"
        :toggles="toggles"
        :visibleGauges="visibleGauges"
        :gaugeCols="gaugeCols"
        :scoreBadgeClass="scoreBadgeClass"
        :num="num"

        :computeGauges="computeGauges"
        :flagsFor="flagsFor"
        :bpDataFor="bpDataFor"
        :bpLoadingFor="bpLoadingFor"
        :linkDataFor="linkDataFor"
        :linkLoadingFor="linkLoadingFor"
        :seoRowsFor="seoRowsFor"

        :gaugeLoadingFor="gaugeLoadingFor"
        @compare="openCompare"
    />

  </main>
  <CompareModal
      :open="compareOpen"
      :src-old="compareOld"
      :src-new="compareNew"
      @close="compareOpen = false"
  />
</template>