<!--src/views/RunView.vue-->
<script setup>
import { onMounted, computed, ref } from "vue";
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

onMounted(() => {
  store.openRun(runId.value, true); // live SSE
});

// List of scans for the table
const scanList = computed(() => {
  return Object.entries(store.scans)
      .filter(([id]) => id && id !== "undefined")
      .map(([id, scan]) => ({ id, ...scan }));
});

// currently selected scan object for tabbed view
const selectedScan = computed(() => {
  if (!selectedScanId.value) return null;
  const raw = store.scans[selectedScanId.value];
  if (!raw) return null;
  return { id: selectedScanId.value, ...raw };
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

    <section class="card">
      <div class="controls-bar">
        <div class="mono muted">
          Scans: {{ scanList.length }}
        </div>

        <div class="controls-cta">
          <button v-if="isAdmin" class="main-cta" type="button" @click="rerunRun">
            Rerun Run
          </button>
        </div>
      </div>
    </section>

    <section class="results">
      <ScanRow
          v-for="(scan, idx) in scanList"
          :key="scan.id"
          :scan="scan"
          :scan-id="scan.id"
          :open="selectedScanId === scan.id"
          :index="idx"
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
