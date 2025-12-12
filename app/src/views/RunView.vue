<script setup>
import { onMounted, computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useRunStore } from "../store/runStore.js";
import * as api from "../api/runs.js";
import ScanRow from "../components/scan/ScanRow.vue";

const route = useRoute();
const store = useRunStore();
const runId = computed(() => route.params.id);

// selection for detail tabs
const selectedScanId = ref(null);

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
  <div>
    <!-- RUN HEADER with rerun icon -->
    <h1 style="display:flex; align-items:center; gap:8px;">
      <span>Run {{ runId }}</span>

      <button
          type="button"
          title="Rerun all scans"
          @click="rerunRun"
          style="cursor:pointer;"
      >
        🔁
      </button>
    </h1>

    <h2>Scans</h2>

    <table border="1" cellpadding="8">
      <thead>
      <tr>
        <th>Scan ID</th>
        <th>Status</th>
        <th>Old URL</th>
        <th>New URL</th>
        <th>Phase</th>
        <th>Score (Text)</th>
        <th>Score (SEO)</th>
        <th>Actions</th>
      </tr>
      </thead>

      <tbody>
      <tr
          v-for="scan in scanList"
          :key="scan.id"
      >
        <td>{{ scan.id }}</td>
        <td>{{ scan.status }}</td>
        <td>{{ scan.urls?.old }}</td>
        <td>{{ scan.urls?.new }}</td>
        <td>
          <span v-if="scan.pageDataCheck && !scan.text">Phase 1</span>
          <span v-else-if="scan.text">Phase 2</span>
          <span v-else>-</span>
        </td>
        <td>{{ scan.text?.contentParity?.score ?? "-" }}</td>
        <td>{{ scan.seo?.summary?.globalScore ?? "-" }}</td>

        <td>
          <!-- view / open in tabbed area -->
          <button
              type="button"
              title="View details"
              @click="selectScan(scan.id)"
              style="margin-right:4px;"
          >
            👁️
          </button>

          <!-- rescan single -->
          <button
              type="button"
              title="Rescan"
              @click="rescanScan(scan.id)"
              style="margin-right:4px;"
          >
            🔄
          </button>

          <!-- edit URLs -->
          <button
              type="button"
              title="Edit URLs"
              @click="editScan(scan)"
              style="margin-right:4px;"
          >
            ✏️
          </button>

          <!-- delete scan -->
          <button
              type="button"
              title="Delete scan"
              @click="deleteScan(scan.id)"
          >
            🗑️
          </button>
        </td>
      </tr>
      </tbody>
    </table>

    <!-- TAB VIEWER FOR SELECTED SCAN -->
    <div v-if="selectedScan" style="margin-top:24px;">
      <h3>
        Scan details
        <span style="font-size:12px; opacity:0.7;">
          ({{ selectedScan.urls?.old }} → {{ selectedScan.urls?.new }})
        </span>
      </h3>

      <!-- Your MQC2 tabbed viewer -->
      <ScanRow :scan="selectedScan" />
    </div>

    <!-- ADD NEW SCAN TO RUN -->
    <h3 style="margin-top:24px;">Add scan to this run</h3>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <input
          v-model="newOldUrl"
          placeholder="Old URL"
          style="min-width:280px;"
      />
      <input
          v-model="newNewUrl"
          placeholder="New URL"
          style="min-width:280px;"
      />
      <button type="button" @click="addScan">Add scan</button>
    </div>
  </div>
</template>
