<script setup>
import { reactive, ref, onMounted, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import * as api from "../api/runs.js";
import CheckConfigSelector from "../components/CheckConfigSelector.vue";
import BulkUploader from "../components/BulkUploader.vue";
import l2l from '../assets/l2l.png'
import philips from '../assets/philips.svg'
import ModeSelector from "../components/ModeSelector.vue";

const router = useRouter();
const mode = ref("single");
const countryWrap = ref(null);
const buWrap = ref(null);

// Default checkConfig
const defaultConfig = () => ({
  text: true,
  visualComparisonDesktop: true,
  screenshotMobile: true,
  links: true,
  seo: false,
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

const COUNTRY_KEY = "mqc_selected_country";
const BU_KEY = "mqc_selected_bu";

const countries = ref([]);
const countryOpen = ref(false);
const buOpen = ref(false);

async function loadCountries() {
  const res = await fetch("/console/ph-pse/mqc/api/locales/countries");
  const json = await res.json();
  countries.value = (json.countries || [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        label: `${c.name} (${c.code})`,
        value: c.code,
      }));
}

const buOptions = [
  { label: "Personal Health (PH)", value: "PH" },
  { label: "Brand License (BL)", value: "BL" },
  { label: "Personal Health + Brand License (PH+BL)", value: "PH+BL" }
];

function selectCountry(code) {
  fetchRun.countryCode = code;
  countryOpen.value = false;
}

function selectBU(code) {
  fetchRun.businessUnit = code;
  buOpen.value = false;
}

onMounted(() => {
  loadCountries();

  const savedCountry = localStorage.getItem(COUNTRY_KEY);
  if (savedCountry) fetchRun.countryCode = savedCountry;

  const savedBU = localStorage.getItem(BU_KEY);
  if (savedBU) fetchRun.businessUnit = savedBU;
});

watch(
    () => fetchRun.countryCode,
    (v) => {
      if (v) localStorage.setItem(COUNTRY_KEY, v);
      else localStorage.removeItem(COUNTRY_KEY);
    }
);

watch(
    () => fetchRun.businessUnit,
    (v) => {
      if (v) localStorage.setItem(BU_KEY, v);
      else localStorage.removeItem(BU_KEY);
    }
);

function closeDropdowns() {
  countryOpen.value = false;
  buOpen.value = false;
}

function onGlobalPointerDown(e) {
  const t = e.target;

  const hitCountry = countryWrap.value?.contains(t);
  const hitBU = buWrap.value?.contains(t);

  // If click is outside both dropdown wrappers, close all
  if (!hitCountry && !hitBU) closeDropdowns();
}

function onGlobalKeyDown(e) {
  if (e.key === "Escape") closeDropdowns();
}

onMounted(() => {
  document.addEventListener("pointerdown", onGlobalPointerDown);
  document.addEventListener("keydown", onGlobalKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onGlobalPointerDown);
  document.removeEventListener("keydown", onGlobalKeyDown);
});


</script>

<template>

  <main class="page">
    <div class="vcenter">
      <div class="vcenter__inner">
        <header class="page__header">
          <div class="logos">
            <img :src="philips" alt="" class="logo" />
            <span class="slash muted" aria-hidden="true">//</span>
            <img :src="l2l" alt="" class="logo" />
          </div>
          <h1>L2L MQC <span class="muted">— Migration Quality Checker</span></h1>
          <p class="muted sub-title">Compare production vs migrated pages, side-by-side.</p>
        </header>

        <!-- MQC1 segmented control -->
        <ModeSelector v-model="mode" />

        <!-- Controls -->
        <section class="card">
          <!-- SINGLE -->
          <div v-if="mode === 'single'" class="grid grid-2 gap-14">
            <div class="field">
              <label>AEM URL</label>
              <input
                  v-model="single.urlOld"
                  placeholder="https://www.philips.ie/"
              />
            </div>

            <div class="field">
              <label>Contentstack URL</label>
              <input
                  v-model="single.urlNew"
                  placeholder="https://stg.philips.ie/"
              />
            </div>

            <div class="field col-span-2">
              <div>
                <label>Run Name (optional)</label>
                <input v-model="single.runName" placeholder="e.g. Ireland UAT Review" />
              </div>
            </div>

            <div class="controls-bar col-span-2">
              <CheckConfigSelector v-model="single.checkConfig" />
              <div class="controls-cta">
                <button class="main-cta" @click="createSingleRun">
                  Analyze
                </button>
              </div>
            </div>
          </div>

          <!-- FETCH -->
          <div v-if="mode === 'fetch'" class="grid grid-2 gap-14">
            <!-- COUNTRY -->
            <div class="field">
              <label>Country</label>

              <div class="dd-wrapper">
                <div
                    class="dd-trigger"
                    @click="
                      countryOpen = !countryOpen;
                      if (countryOpen) buOpen = false;
                    "
                            >
                    <span v-if="fetchRun.countryCode">
                      {{ countries.find(c => c.value === fetchRun.countryCode)?.label }}
                    </span>
                  <span v-else class="dd-placeholder">Select a country</span>

                  <svg class="dd-chevron" :class="{ open: countryOpen }" viewBox="0 0 24 24">
                    <path
                        d="M19 9l-7 7-7-7"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                  </svg>
                </div>

                <transition name="fade">
                  <div v-if="countryOpen" class="dd-panel">
                    <div
                        v-for="c in countries"
                        :key="c.value"
                        class="dd-item"
                        @click="selectCountry(c.value)"
                    >
                      {{ c.label }}
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- BUSINESS UNIT -->
            <div class="field">
              <label>Business Unit</label>

              <div class="dd-wrapper">
                <div
                    class="dd-trigger"
                    @click="
                      buOpen = !buOpen;
                      if (buOpen) countryOpen = false;
                    "
                            >
                    <span v-if="fetchRun.businessUnit">
                      {{ buOptions.find(b => b.value === fetchRun.businessUnit)?.label }}
                    </span>
                  <span v-else class="dd-placeholder">Select a business unit</span>

                  <svg class="dd-chevron" :class="{ open: buOpen }" viewBox="0 0 24 24">
                    <path
                        d="M19 9l-7 7-7-7"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                  </svg>
                </div>

                <transition name="fade">
                  <div v-if="buOpen" class="dd-panel">
                    <div
                        v-for="b in buOptions"
                        :key="b.value"
                        class="dd-item"
                        @click="selectBU(b.value)"
                    >
                      {{ b.label }}
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div class="field col-span-2">
              <label>Run Name (optional)</label>
              <input v-model="fetchRun.runName" placeholder="e.g. Ireland UAT Review" />
            </div>

            <div class="controls-bar col-span-2">
              <CheckConfigSelector v-model="fetchRun.checkConfig" />
              <div class="controls-cta">
                <button class="main-cta" @click="createFetchRun">
                  Analyze
                </button>
              </div>
            </div>
          </div>

          <!-- BULK -->
          <div v-if="mode === 'bulk'" class="grid grid-2 gap-14">

            <div class="col-span-2">
              <BulkUploader
              :file-name="bulkFileName"
              :is-dragging="bulkIsDragging"
              @change="handleBulkChange"
              @dragover="handleBulkDragOver"
              @dragleave="handleBulkDragLeave"
              @drop="handleBulkDrop"
              />
            </div>

            <div class="field col-span-2">
              <label>Run Name (optional)</label>
              <input v-model="bulkRun.runName" placeholder="e.g. Ireland UAT Review" />
            </div>

            <div class="controls-bar col-span-2">
              <CheckConfigSelector v-model="bulkRun.checkConfig" />
              <div class="controls-cta">
                <button class="main-cta" @click="createBulkRun" :disabled="!bulkFile">
                  Analyze
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </main>
</template>
