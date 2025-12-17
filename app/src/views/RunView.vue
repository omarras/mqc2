<!--src/views/RunView.vue-->
<script setup>
import { onMounted, onBeforeUnmount, computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useRunStore } from "../store/runStore.js";
import * as api from "../api/runs.js";
import ScanRow from "../components/scan/ScanRow.vue";
import philips from "../assets/philips.svg";
import l2l from "../assets/l2l.png";

const route = useRoute();

const isAdmin = computed(() => {
  // 1) props flag (from router)
  if (route.matched.some(r => r.path.includes("/admin"))) return true;

  // fallback if you want: props passed in
  return route.path.endsWith("/admin");
});

const store = useRunStore();

// Computeds
const runId = computed(() => route.params.id);
const runName = computed(() => {
  if (!store.currentRun) return "Run";
  return store.currentRun.runName || runId.value;
});


// selection for detail tabs
const selectedScanId = ref(null);

function toggleOpen(id) {
  selectedScanId.value = selectedScanId.value === id ? null : id;
}

// simple add-scan inputs
const newOldUrl = ref("");
const newNewUrl = ref("");
const submittedCount = computed(() => store.currentRun?.submittedCount ?? null);

onMounted(() => {
  store.openRun(runId.value, true); // live SSE
});

const groupedResults = computed(() => {
  const scans = filteredScanList.value;

  // Only group if at least one filtered scan has a targetTemplateCombined
  const groupingEnabled = scans.some(s => norm(getTargetTemplateCombined(s)));

  if (!groupingEnabled) {
    return [
      {
        key: "all",
        label: "All results",
        items: scans
      }
    ];
  }

  // init buckets in the predefined order, plus Other at the end
  const buckets = new Map();
  for (const g of TEMPLATE_GROUPS) buckets.set(g.key, []);
  buckets.set(OTHER_GROUP.key, []);

  // assign scans to buckets
  for (const s of scans) {
    const k = resolveGroup(s);
    if (!k) continue; // should not happen if groupingEnabled, but safe
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(s);
  }

  // emit only non-empty groups, in the correct order
  const out = [];

  for (const g of TEMPLATE_GROUPS) {
    const items = buckets.get(g.key) || [];
    if (items.length) out.push({ key: g.key, label: g.label, items });
  }

  const otherItems = buckets.get(OTHER_GROUP.key) || [];
  if (otherItems.length) out.push({ key: OTHER_GROUP.key, label: OTHER_GROUP.label, items: otherItems });

  return out;
});

// RUN-LEVEL RERUN
async function rerunRun() {
  await api.rerun(runId.value);
  await store.openRun(runId.value, true);
}

// SCAN-LEVEL RESCAN
async function rescanScan(scanId) {
  await api.rescan(runId.value, [scanId]);
  await store.openRun(runId.value, true);
}

// SCAN-LEVEL DELETE
async function deleteScan(scanId) {
  if (!confirm("Delete this scan from the run?")) return;
  await api.deleteScans(runId.value, [scanId]);

  delete store.scans[scanId];
  store.currentRun = await api.getRun(runId.value);

  // if we deleted the selected one, clear selection
  if (selectedScanId.value === scanId) {
    selectedScanId.value = null;
  }
}

// SCAN-LEVEL EDIT (simple prompt-based)
async function editScan(scan) {
  const newOld = prompt("Edit old URL", scan.urls?.old || "");
  if (newOld === null) return;

  const newNew = prompt("Edit new URL", scan.urls?.new || "");
  if (newNew === null) return;

  await api.updateScan(runId.value, scan.id, {
    urlOld: newOld,
    urlNew: newNew
  });

  store.scans[scan.id] = {
    ...store.scans[scan.id],
    urls: {
      ...(store.scans[scan.id].urls || {}),
      old: newOld,
      new: newNew
    }
  };
}

// ADD NEW URL PAIR – reuse run's checkConfig
const baseCheckConfig = computed(() => {
  // 1) run-level
  if (store.currentRun && store.currentRun.checkConfig) {
    return store.currentRun.checkConfig;
  }

  // 2) scan-level from DB snapshot
  const scans = store.currentRun?.scans || [];
  const withCfg = scans.find(s => s.checkConfig);
  if (withCfg) return withCfg.checkConfig;

  // 3) fallback
  return {
    text: true,
    seo: true,
    links: true,
    visualComparisonDesktop: true,
    screenshotMobile: true
  };
});

// ADD NEW SCAN TO RUN, using baseCheckConfig
async function addScan() {
  if (!newOldUrl.value || !newNewUrl.value) {
    alert("Please fill both URLs");
    return;
  }

  const checkConfig = baseCheckConfig.value;

  await api.addScans(runId.value, [
    {
      urlOld: newOldUrl.value,
      urlNew: newNewUrl.value,
      checkConfig
    }
  ]);

  newOldUrl.value = "";
  newNewUrl.value = "";

  await store.openRun(runId.value, true);
}

// select a scan for the tabbed detail viewer
function selectScan(scanId) {
  selectedScanId.value = scanId;
}

// --- UX controls ---
const searchQuery = ref("");

// Status: all | available | failed
const statusMode = ref("all");
const effectiveStatusMode = computed(() => (isAdmin.value ? statusMode.value : "available"));

// Popover open state
const filterOpen = ref(false);

// Checkbox selections (store raw values)
const selectedTemplates = ref(new Set());
const selectedApproaches = ref(new Set());

// Track if user manually changed, so we don’t keep auto-resetting
const touchedTemplates = ref(false);
const touchedApproaches = ref(false);

function toggleFilterMenu() {
  filterOpen.value = !filterOpen.value;
}

function closeFilterMenu() {
  filterOpen.value = false;
}

// Close on ESC
function onKeyDown(e) {
  if (e.key === "Escape") closeFilterMenu();
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
});

// ---- Grouping (ordered) ----
const TEMPLATE_GROUPS = [
  { key: "homePage", label: "Home Page", match: ["homePage"] },
  { key: "categoryPage", label: "Category Page", match: ["categoryPage"] },
  { key: "championPage", label: "Champion Page", match: ["championPage"] },
  { key: "championPageIconic", label: "Champion Page Iconic", match: ["championPageIconic"] },
  { key: "articlePage", label: "Article Page", match: ["articlePage"] },
  { key: "BUHomepage", label: "BU Homepage", match: ["BUHomepage"] },
  { key: "articleHubPage", label: "Article Hub", match: ["articleHubPage"] },
  { key: "retailPromotionPage", label: "Retail Promotion Page", match: ["retailPromotionPage"] },
  { key: "salesCampaignPage", label: "Sales Campaign Page", match: ["salesCampaignPage"] },
  { key: "propositionPage", label: "Proposition Page", match: ["propositionPage"] },
  { key: "promotionListingPage", label: "Promotion Listing Page", match: ["promotionListingPage"] },
  { key: "supportHomePage", label: "Support Home Page", match: ["supportHomePage"] },
  { key: "supportCategoryPage", label: "Support Category Page", match: ["supportCategoryPage"] },
  { key: "supportArticleSFKMPage", label: "Support Article SFKM Page", match: ["supportArticleSFKMPage"] },
  { key: "supportTopicPage", label: "Support Topic Page", match: ["supportTopicPage"] },
  { key: "supportContactPage", label: "Support Contact Page", match: ["supportContactPage"] },
  { key: "profArticleHubPage", label: "Prof Article Hub Page", match: ["profArticleHubPage"] },
  { key: "profArticlePage", label: "Prof Article Page", match: ["profArticlePage"] },
  { key: "profCategoryPage", label: "Prof Category Page", match: ["profCategoryPage"] },
  { key: "profClinicalStudy", label: "Prof Clinical Study", match: ["profClinicalStudy"] },
  { key: "profEducationPage", label: "Prof Education Page", match: ["profEducationPage"] },
  { key: "profHomepage", label: "Prof Homepage", match: ["profHomepage"] },
  { key: "profProductDetailPage", label: "Prof Product Detail Page", match: ["profProductDetailPage"] },
  { key: "profRangePage", label: "Prof Range Page", match: ["profRangePage"] },
  { key: "profSpotlightStory", label: "Prof Spotlight Story", match: ["profSpotlightStory"] },
  { key: "checkout", label: "Checkout", match: ["checkout"] },
  { key: "CRMFormPage", label: "CRM Form Page", match: ["CRMFormPage"] },
  { key: "dealerLocator", label: "Dealer Locator", match: ["dealerLocator"] },
  { key: "decisionPage", label: "Decision Page", match: ["decisionPage"] },
  { key: "errorPage", label: "Error Page", match: ["errorPage"] },
  { key: "myphilips", label: "MyPhilips", match: ["myphilips"] },
  { key: "overlayPage", label: "Overlay Page", match: ["overlayPage"] },
  { key: "partsAndAccessories", label: "Parts And Accessories", match: ["partsAndAccessories"] },
  { key: "productDetailPage", label: "Product Detail Page", match: ["productDetailPage"] },
  { key: "searchResultsProducts", label: "Search Results Products", match: ["searchResultsProducts"] },
  { key: "searchResultsSupport", label: "Search Results Support", match: ["searchResultsSupport"] },
  { key: "serviceLocator", label: "Service Locator", match: ["serviceLocator"] },
  { key: "APP_CONTENT", label: "APP CONTENT", match: ["APP_CONTENT"] },
  { key: "NO_TARGET_AVAILABLE", label: "NO TARGET AVAILABLE", match: ["NO_TARGET_AVAILABLE"] },
  { key: "NOT_APPLICABLE", label: "NOT APPLICABLE", match: ["NOT_APPLICABLE"] },
  { key: "ONLY_CONTENT_MODEL", label: "ONLY CONTENT MODEL", match: ["ONLY_CONTENT_MODEL"] },
  { key: "UNKNOWN", label: "UNKNOWN", match: ["UNKNOWN"] }
];

const OTHER_GROUP = { key: "other", label: "Other", match: [] };

function resolveGroup(scan) {
  const raw = norm(getTargetTemplateCombined(scan));
  if (!raw) return null;

  // Find first matching group in your predefined order
  for (const g of TEMPLATE_GROUPS) {
    if (g.match.some(m => raw.includes(norm(m)))) return g.key;
  }
  return OTHER_GROUP.key;
}

const collapsedGroups = ref({}); // { [groupKey]: boolean }

function isCollapsed(key) {
  return !!collapsedGroups.value[key];
}

function toggleGroup(key) {
  collapsedGroups.value[key] = !collapsedGroups.value[key];
}

const GLOBAL_PAGE_SIZE = 25;
const globalLimit = ref(GLOBAL_PAGE_SIZE);

const orderedFilteredScans = computed(() => {
  // preserve the same order you render in groups
  // groupedResults already holds items in desired group order
  const flat = [];
  for (const g of groupedResults.value) {
    for (const s of g.items) flat.push(s);
  }
  return flat;
});

const visibleScanIds = computed(() => {
  const ids = new Set();
  orderedFilteredScans.value.slice(0, globalLimit.value).forEach(s => ids.add(s.id));
  return ids;
});

const canShowAll = computed(() => orderedFilteredScans.value.length > globalLimit.value);

function showAllGlobal() {
  globalLimit.value = orderedFilteredScans.value.length;
}

const statusCounts = computed(() => {
  const counts = { pending: 0, running: 0, completed: 0, failed: 0, other: 0 };
  for (const s of scanList.value) {
    const st = norm(s.status);
    if (st in counts) counts[st] += 1;
    else counts.other += 1;
  }
  return counts;
});

const userSummary = computed(() => {
  // "available amount" for user view = completed scans
  const available = scanList.value.filter(s => norm(s.status) === "completed");

  const out = {
    totalAvailable: available.length,
    ready: 0,
    feedback: 0,
    approved: 0,
    mismatch: 0
  };

  for (const s of available) {
    const ds = normDs(getDsStatus(s));

    if (ds === "ready for uat") out.ready += 1;
    else if (ds === "uat feedback provided") out.feedback += 1;
    else if (ds === "uat approved") out.approved += 1;
    else out.mismatch += 1;
  }

  return out;
});

const displayIndexMap = computed(() => {
  const map = new Map();
  orderedFilteredScans.value.forEach((s, i) => {
    map.set(s.id, i + 1); // 1-based, sequential after grouping
  });
  return map;
});

function displayIndex(scan) {
  return displayIndexMap.value.get(scan.id) ?? 0;
}

onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

function getTitle(scan) {
  return (
      scan?.pageDataCheck?.urlNew?.title ||
      scan?.metadata?.pageDataCheck?.urlNew?.title ||
      null
  );
}

function getOldUrl(scan) {
  return scan?.urls?.old || scan?.urlOld || scan?.pageDataCheck?.urlOld?.originalUrl || "";
}

function getNewUrl(scan) {
  return scan?.urls?.new || scan?.urlNew || scan?.pageDataCheck?.urlNew?.originalUrl || "";
}

function getTargetTemplateCombined(scan) {
  return (
      scan?.metadata?.targetTemplateCombined ||
      scan?.targetTemplateCombined ||
      scan?.pageDataCheck?.targetTemplateCombined ||
      ""
  );
}

function getApproachCombined(scan) {
  return (
      scan?.metadata?.approachCombined ||
      scan?.approachCombined ||
      ""
  );
}

function getDsStatus(scan) {
  return (
      scan?.metadata?.dsStatus ||
      scan?.dsStatus ||
      ""
  );
}

function normDs(v) {
  return String(v ?? "").trim().toLowerCase();
}

function matchesSearch(scan, q) {
  if (!q) return true;
  const haystack = [getOldUrl(scan), getNewUrl(scan), getTitle(scan)]
      .filter(Boolean)
      .map(norm)
      .join(" ");
  return haystack.includes(q);
}

/**
 * Base scan list (unchanged)
 */
const scanList = computed(() => {
  return Object.entries(store.scans)
      .filter(([id]) => id && id !== "undefined")
      .map(([id, scan]) => ({ id, ...scan }));
});

/**
 * Apply search + status (but not template/approach yet).
 * This is the “page set” you want to derive checkbox options from.
 */
const baseFilteredScans = computed(() => {
  const q = norm(searchQuery.value);

  return scanList.value.filter(scan => {
    if (!matchesSearch(scan, q)) return false;

    const st = norm(scan.status);
    const mode = effectiveStatusMode.value;

    if (mode === "available") return st === "completed";
    if (mode === "failed") return st === "failed";
    return true; // all
  });
});

/**
 * Options that exist in the current baseFilteredScans
 */
const availableTemplateOptions = computed(() => {
  const set = new Set();
  for (const s of baseFilteredScans.value) {
    const v = getTargetTemplateCombined(s);
    if (norm(v)) set.add(v.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

const availableApproachOptions = computed(() => {
  const set = new Set();
  for (const s of baseFilteredScans.value) {
    const v = getApproachCombined(s);
    if (norm(v)) set.add(v.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

/**
 * Initialize defaults: when options appear, select all.
 * If user already changed checkboxes, keep their choices and prune missing values.
 */
watch(availableTemplateOptions, (opts) => {
  const cur = selectedTemplates.value;

  if (!touchedTemplates.value || cur.size === 0) {
    selectedTemplates.value = new Set(opts);
    return;
  }

  // prune selections that no longer exist
  const allowed = new Set(opts);
  const next = new Set();
  cur.forEach(v => { if (allowed.has(v)) next.add(v); });
  selectedTemplates.value = next;
}, { immediate: true });

watch(availableApproachOptions, (opts) => {
  const cur = selectedApproaches.value;

  if (!touchedApproaches.value || cur.size === 0) {
    selectedApproaches.value = new Set(opts);
    return;
  }

  const allowed = new Set(opts);
  const next = new Set();
  cur.forEach(v => { if (allowed.has(v)) next.add(v); });
  selectedApproaches.value = next;
}, { immediate: true });

/**
 * Apply template + approach checkboxes.
 */
const filteredScanList = computed(() => {
  const tplSet = selectedTemplates.value;
  const appSet = selectedApproaches.value;

  return baseFilteredScans.value.filter(scan => {
    const tpl = getTargetTemplateCombined(scan)?.trim();
    const app = getApproachCombined(scan)?.trim();

    // If there are no options, treat as allowed
    const tplOk = !availableTemplateOptions.value.length || tplSet.has(tpl);
    const appOk = !availableApproachOptions.value.length || appSet.has(app);

    return tplOk && appOk;
  });
});

watch(
    () => filteredScanList.value,
    (list) => {
      if (!selectedScanId.value) return;
      const stillVisible = list.some(s => s.id === selectedScanId.value);
      if (!stillVisible) selectedScanId.value = null;
    }
);

/**
 * Checkbox helpers
 */
function toggleTemplate(value) {
  touchedTemplates.value = true;
  const next = new Set(selectedTemplates.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  selectedTemplates.value = next;
}

function toggleApproach(value) {
  touchedApproaches.value = true;
  const next = new Set(selectedApproaches.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  selectedApproaches.value = next;
}

function selectAllTemplates() {
  touchedTemplates.value = true;
  selectedTemplates.value = new Set(availableTemplateOptions.value);
}

function clearTemplates() {
  touchedTemplates.value = true;
  selectedTemplates.value = new Set();
}

function selectAllApproaches() {
  touchedApproaches.value = true;
  selectedApproaches.value = new Set(availableApproachOptions.value);
}

function clearApproaches() {
  touchedApproaches.value = true;
  selectedApproaches.value = new Set();
}

/**
 * Optional: nice label for templates based on your TEMPLATE_GROUPS mapping
 */
function templateLabel(raw) {
  const r = norm(raw);
  for (const g of TEMPLATE_GROUPS) {
    if (g.match.some(m => r.includes(norm(m)))) return g.label;
  }
  return raw;
}

// Reset pagination when filters change
watch([searchQuery, statusMode, selectedTemplates, selectedApproaches], () => {
  globalLimit.value = GLOBAL_PAGE_SIZE;
});

watch(isAdmin, (admin) => {
  if (!admin) statusMode.value = "all";
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
      <h1>{{ runName }}</h1>
      <p class="muted sub-title">
        Review migrated pages against production, one by one.
      </p>
    </header>

    <!-- Summary -->
    <section v-if="isAdmin" class="run-summary">
      <div class="summary-grid">
        <div v-if="submittedCount !== null" class="kpi kpi--blue">
          <div class="kpi__label">Keep</div>
          <div class="kpi__value">{{ submittedCount }}</div>
        </div>

        <div class="kpi kpi--yellow">
          <div class="kpi__label">Page Rebuild</div>
          <div class="kpi__value">{{ scanList.length }}</div>
        </div>

        <div class="kpi kpi--red">
          <div class="kpi__label">Page Scan Failed</div>
          <div class="kpi__value">{{ statusCounts.failed }}</div>
        </div>

        <div class="kpi kpi--green">
          <div class="kpi__label">Page Scan Available</div>
          <div class="kpi__value">{{ statusCounts.completed }}</div>
        </div>
      </div>
    </section>

    <section v-if="!isAdmin" class="run-summary">
      <div class="summary-grid">
        <div class="kpi kpi--neutral">
          <div class="kpi__label">Total to review</div>
          <div class="kpi__value">{{ userSummary.totalAvailable }}</div>
        </div>

        <div class="kpi kpi--blue">
          <div class="kpi__label">Ready for UAT</div>
          <div class="kpi__value">{{ userSummary.ready }}</div>
        </div>

        <div class="kpi kpi--yellow">
          <div class="kpi__label">Feedback provided</div>
          <div class="kpi__value">{{ userSummary.feedback }}</div>
        </div>

        <div class="kpi kpi--green">
          <div class="kpi__label">Approved</div>
          <div class="kpi__value">{{ userSummary.approved }}</div>
        </div>
      </div>
    </section>

    <!-- Search + filter (no card, centered, “floating”) -->
    <div class="run-filters">
      <div class="run-filters__inner">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 4a6 6 0 1 1 0 12a6 6 0 0 1 0-12zm0-2a8 8 0 1 0 4.9 14.3l4.4 4.4a1 1 0 0 0 1.4-1.4l-4.4-4.4A8 8 0 0 0 10 2z"/>
          </svg>

          <input
              v-model="searchQuery"
              class="input input--search"
              type="search"
              placeholder="Search AEM URL, Contentstack URL or Page Title"
          />
        </div>
        <div class="filter-wrap">
          <button
              type="button"
              class="filter-btn"
              :class="{ 'is-open': filterOpen }"
              @click="toggleFilterMenu"
              aria-haspopup="true"
              :aria-expanded="filterOpen ? 'true' : 'false'"
          >
            <svg class="filter-icon" viewBox="0 0 24 24" aria-hidden="true">
              <!-- funnel icon -->
              <path d="M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 .8 1.6L14 13.5V19a1 1 0 0 1-1.45.9l-3-1.5A1 1 0 0 1 9 17.5v-4L3.2 5.6A1 1 0 0 1 3 5z"/>
            </svg>
            <span class="filter-btn__text">Filters</span>
          </button>

          <div v-if="filterOpen" class="filter-popover">
            <!-- STATUS -->
            <div v-if="isAdmin" class="filter-section">
              <div class="filter-title">Status</div>

              <div class="segmented">
                <button
                    type="button"
                    class="segmented__btn"
                    :class="{ active: statusMode === 'all' }"
                    @click="statusMode = 'all'"
                >All</button>

                <button
                    type="button"
                    class="segmented__btn"
                    :class="{ active: statusMode === 'available' }"
                    @click="statusMode = 'available'"
                >Available</button>

                <button
                    type="button"
                    class="segmented__btn"
                    :class="{ active: statusMode === 'failed' }"
                    @click="statusMode = 'failed'"
                >Failed</button>
              </div>
            </div>

            <div v-if="isAdmin" class="filter-divider"></div>

            <!-- TARGET TEMPLATE -->
            <div class="filter-section">
              <div class="filter-title-row">
                <div class="filter-title">Target template</div>
              </div>

              <div class="filter-list">
                <label v-for="tpl in availableTemplateOptions" :key="tpl" class="tgl">
                  <input type="checkbox"
                         :checked="selectedTemplates.has(tpl)"
                         @change="toggleTemplate(tpl)" />

                  <span class="tgl__ui">
                    <span class="tgl__text">{{ templateLabel(tpl) }}</span>

                    <span class="tgl__switch" aria-hidden="true">
                      <span class="tgl__track"></span>
                      <span class="tgl__thumb"></span>
                    </span>
                  </span>
                </label>

                <div v-if="availableTemplateOptions.length === 0" class="muted" style="opacity:.7;">
                  No templates found in this selection.
                </div>
              </div>
            </div>

            <div class="filter-divider"></div>

            <!-- MIGRATION APPROACH -->
            <div class="filter-section">
              <div class="filter-title-row">
                <div class="filter-title">Migration approach</div>
              </div>

              <div class="filter-list">
                <label v-for="a in availableApproachOptions" :key="a" class="tgl">
                  <input type="checkbox"
                         :checked="selectedApproaches.has(a)"
                         @change="toggleApproach(a)" />

                  <span class="tgl__ui">
                    <span class="tgl__text">{{ a }}</span>

                    <span class="tgl__switch" aria-hidden="true">
                      <span class="tgl__track"></span>
                      <span class="tgl__thumb"></span>
                    </span>
                  </span>
                </label>

                <div v-if="availableApproachOptions.length === 0" class="muted" style="opacity:.7;">
                  No approaches found in this selection.
                </div>
              </div>
            </div>
          </div>
        </div>


        <button v-if="isAdmin" class="main-cta" type="button" @click="rerunRun">
          Rerun Run
        </button>
      </div>
    </div>


    <section class="results">
      <template v-for="group in groupedResults" :key="group.key">
        <div v-if="group.key !== 'all'" class="group-title">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <h3 style="margin:0; cursor:pointer;" @click="toggleGroup(group.key)">
              {{ group.label }}
              <span class="mono muted group-pages">
        ({{ group.items.length }} {{ group.items.length === 1 ? "page" : "pages" }})
      </span>
            </h3>

            <button type="button" class="btn btn--sm btn--outline" @click="toggleGroup(group.key)">
              {{ isCollapsed(group.key) ? "Expand" : "Collapse" }}
            </button>
          </div>
        </div>

        <template v-if="!isCollapsed(group.key)">
          <ScanRow
              v-for="scan in group.items.filter(s => visibleScanIds.has(s.id))"
              :key="scan.id"
              :scan="scan"
              :scan-id="scan.id"
              :run-id="runId"
              :open="selectedScanId === scan.id"
              :index="displayIndex(scan)"
              :is-admin="isAdmin"
              :check-config-snapshot="store.currentRun?.checkConfigSnapshot"
              @toggle="toggleOpen"
          >
            <template v-if="isAdmin" #adminActions>
              <button type="button" class="open-link open-link--edit" @click.stop="rescanScan(scan.id)">
                Rescan
              </button>
              <button type="button" class="open-link open-link--edit" @click.stop="editScan(scan)">
                Edit
              </button>
              <button type="button" class="open-link open-link--edit" @click.stop="deleteScan(scan.id)">
                Delete
              </button>
            </template>
          </ScanRow>
        </template>
      </template>
      <div v-if="canShowAll" style="display:flex; justify-content:center; margin:16px 0 30px;">
        <button type="button" class="btn btn--sm btn--outline" @click="showAllGlobal">
          Show all ({{ orderedFilteredScans.length }})
        </button>
      </div>
    </section>

    <section v-if="isAdmin" class="card">
      <h2 style="margin-bottom:12px;">Add scan to this run</h2>

      <div class="grid grid-2">
        <div class="field">
          <label>AEM URL</label>
          <input v-model="newOldUrl" placeholder="https://www.philips.ie/" />
        </div>

        <div class="field">
          <label>Contentstack URL</label>
          <input v-model="newNewUrl" placeholder="https://stg.philips.ie/" />
        </div>
      </div>

      <div class="controls-bar">
        <div></div>
        <div class="controls-cta">
          <button class="main-cta" type="button" @click="addScan">
            Add scan
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
