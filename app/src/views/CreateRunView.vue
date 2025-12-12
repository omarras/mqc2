<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import * as api from "../api/runs.js";
import CheckConfigSelector from "../components/CheckConfigSelector.vue";
import BulkUploader from "../components/BulkUploader.vue";

const router = useRouter();
const mode = ref("single");

// Default checkConfig
const defaultConfig = () => ({
  text: true,
  seo: true,
  links: true,
  visualComparisonDesktop: true,
  screenshotMobile: true
});

// PREFILL EXAMPLE URLs
const defaultOldUrl = "https://www.philips.sk/c-m-mo/baby-bottles";
const defaultNewUrl = "https://stg.philips.sk/c-m-mo/detske-flase-a-cumliky";

// Single run
const single = reactive({
  urlOld: defaultOldUrl,
  urlNew: defaultNewUrl,
  runName: "",
  checkConfig: defaultConfig()
});

// Fetch run
const fetchRun = reactive({
  countryCode: "",
  businessUnit: "",
  locales: [],
  buCombined: [],
  runName: "",
  checkConfig: defaultConfig()
});

// Bulk run
const bulkRun = reactive({
  runName: "",
  checkConfig: defaultConfig()
});

const bulkFile = ref(null);
const bulkFileName = ref("");
const bulkIsDragging = ref(false);

// Single
async function createSingleRun() {
  const { runId } = await api.createSingle(single);
  router.push(`/runs/${runId}`);
}

// Fetch
async function createFetchRun() {
  const { runId } = await api.createFetch(fetchRun);
  router.push(`/runs/${runId}`);
}

// Bulk: event handlers from BulkUploader
function handleBulkChange(file) {
  bulkFile.value = file;
  bulkFileName.value = file ? file.name : "";
}

function handleBulkDragOver() {
  bulkIsDragging.value = true;
}

function handleBulkDragLeave() {
  bulkIsDragging.value = false;
}

function handleBulkDrop(e) {
  bulkIsDragging.value = false;
  const file = e.dataTransfer?.files?.[0] || null;
  handleBulkChange(file);
}

async function createBulkRun() {
  if (!bulkFile.value) {
    alert("Please select a CSV file first.");
    return;
  }

  const { runId } = await api.createBulk({
    runName: bulkRun.runName,
    checkConfig: bulkRun.checkConfig,
    file: bulkFile.value
  });

  router.push(`/runs/${runId}`);
}
</script>

<template>
  <div>
    <h1>Create Run</h1>

    <select v-model="mode">
      <option value="single">Single</option>
      <option value="fetch">Fetch</option>
      <option value="bulk">Bulk</option>
    </select>

    <!-- Single -->
    <div v-if="mode === 'single'">
      <input placeholder="Old URL" v-model="single.urlOld" />
      <input placeholder="New URL" v-model="single.urlNew" />
      <input placeholder="Run name" v-model="single.runName" />

      <CheckConfigSelector v-model="single.checkConfig" />

      <button @click="createSingleRun">Create Run</button>
    </div>

    <!-- Fetch -->
    <div v-if="mode === 'fetch'">
      <input placeholder="Country" v-model="fetchRun.countryCode" />
      <input placeholder="Business Unit" v-model="fetchRun.businessUnit" />
      <input placeholder="Run name" v-model="fetchRun.runName" />

      <CheckConfigSelector v-model="fetchRun.checkConfig" />

      <button @click="createFetchRun">Create Run</button>
    </div>

    <!-- Bulk -->
    <div v-if="mode === 'bulk'">
      <input placeholder="Run name" v-model="bulkRun.runName" />

      <CheckConfigSelector v-model="bulkRun.checkConfig" />

      <BulkUploader
          :file-name="bulkFileName"
          :is-dragging="bulkIsDragging"
          @change="handleBulkChange"
          @dragover="handleBulkDragOver"
          @dragleave="handleBulkDragLeave"
          @drop="handleBulkDrop"
      />

      <button
          @click="createBulkRun"
          :disabled="!bulkFile"
      >
        Create Run
      </button>
    </div>
  </div>
</template>

