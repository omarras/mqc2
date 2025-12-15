<script setup>
import { computed, ref } from "vue";

import ScanTabOverview from "./ScanTabOverview.vue";
import ScanTabScores from "./ScanTabScores.vue";
import ScanTabScreenshots from "./ScanTabScreenshots.vue";
import ScanTabText from "./ScanTabText.vue";
import ScanTabLinks from "./ScanTabLinks.vue";
import ScanTabSeo from "./ScanTabSeo.vue";

const emit = defineEmits(["toggle"]);

const props = defineProps({
  scan: { type: Object, required: true },
  scanId: { type: String, default: "" },
  open: { type: Boolean, default: false },
  index: { type: Number, default: -1 },
  checkConfigSnapshot: { type: Object, default: null }
});

const STATUS_LABELS = {
  pending: "in queue",
  running: "analyzing",
  completed: "available",
  failed: "failed"
};

const statusLabel = computed(() => {
  const raw = String(status.value || "").toLowerCase();
  return STATUS_LABELS[raw] || status.value;
});

const pageDataCheck = computed(() => props.scan?.pageDataCheck || null);
const status = computed(() => props.scan?.status || "unknown");
const oldUrl = computed(() => props.scan?.urls?.old || props.scan?.pageDataCheck?.urlOld);
const newUrl = computed(() => props.scan?.urls?.new || props.scan?.pageDataCheck?.urlNew);
const oldUrlMeta = computed(() => pageDataCheck.value?.urlOld || {});
const newUrlMeta = computed(() => pageDataCheck.value?.urlNew || {});
const oldTitle = computed(() => oldUrlMeta.value?.title || null);
const newTitle = computed(() => newUrlMeta.value?.title || null);
const oldHttpStatus = computed(() => oldUrlMeta.value?.httpStatus || null);
const newHttpStatus = computed(() => newUrlMeta.value?.httpStatus || null);
const oldPlatform = computed(() => oldUrlMeta.value?.platform || null);
const newPlatform = computed(() => newUrlMeta.value?.platform || null);
const oldError = computed(() => oldUrlMeta.value?.error || null);
const newError = computed(() => newUrlMeta.value?.error || null);
const oldNoCacheUrl = computed(() => oldUrlMeta.value?.noCacheUrl || null);
const newNoCacheUrl = computed(() => newUrlMeta.value?.noCacheUrl || null);
const directionFinal = computed(() =>
    pageDataCheck.value?.directionFinal || null
);
const remarksDS = computed(() =>
    pageDataCheck.value?.remarksDS || null
);
const approachCombined = computed(() =>
    pageDataCheck.value?.approachCombined || null
);
const targetTemplateCombined = computed(() =>
    pageDataCheck.value?.targetTemplateCombined || null
);

const metadata = computed(() => props.scan?.metadata || null);

// convenience: sometimes pageDataCheck exists both at scan.pageDataCheck and scan.metadata.pageDataCheck
const metaPageDataCheck = computed(() =>
    props.scan?.pageDataCheck ||
    metadata.value?.pageDataCheck ||
    null
);
const contentStackEditUrl = computed(() =>
    metadata.value?.contentStackUrl || null
);

function statusBadgeClass(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("done") || v.includes("completed") || v.includes("success")) return "badge badge--ok";
  if (v.includes("fail") || v.includes("error")) return "badge badge--bad";
  if (v.includes("pending")) return "badge badge--pending";
  return "badge badge--neutral";
}

const phaseLabel = computed(() => {
  const hasPhase1 = !!props.scan?.pageDataCheck;
  const hasText = !!props.scan?.text;
  if (hasPhase1 && !hasText) return "Phase 1";
  if (hasText) return "Phase 2";
  return "-";
});

function requestToggle() {
  // parent decides which scan is open
  emit("toggle", props.scanId);
}

</script>

<template>
  <details class="accordion" :open="open">
    <!-- CONTROLLED: prevent native toggle, delegate to parent -->
    <summary class="acc-summary" @click.prevent="requestToggle">
      <div class="acc-row">
        <!-- LEFT: caret + content -->
        <div class="acc-title">
          <span class="acc-caret" :class="{ 'is-open': open }" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16" class="chev">
              <path
                  d="M6 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
              />
            </svg>
          </span>
          <span v-if="index >= 0" class="acc-idx mono muted" aria-hidden="true">
            {{ index + 1 }}
          </span>

          <div class="acc-main">
            <div v-if="newTitle && newTitle !== 'UNKNOWN'" class="acc-page">
              <span class="acc-page-title">{{ newTitle || "UNKNOWN" }}</span>
            </div>

            <div class="acc-urls">
              <a v-if="oldUrl" class="acc-url mono" target="_blank" :href="oldNoCacheUrl" @click.stop>{{ oldUrl }}</a>
              <span v-else class="acc-url mono muted">—</span>

              <span class="acc-arrow">→</span>

              <a v-if="newUrl" class="acc-url mono" target="_blank" :href="newNoCacheUrl" @click.stop>{{ newUrl }}</a>
            </div>
          </div>
        </div>

        <!-- RIGHT: status -->
        <div class="acc-chips" @click.stop>
          <span class="result-status" :class="statusBadgeClass(status)">{{ statusLabel }}</span>
          <slot name="adminActions" />
        </div>
      </div>
    </summary>

    <div class="segmented card" role="radiogroup" aria-label="Scan tabs">
      <div class="acc-content">
        <!-- Overview -->
        <div class="card" style="margin-top:12px;">
          <ScanTabOverview :scan="scan" />
        </div>

        <!-- Scores -->
        <div style="margin-top:12px;">
          <ScanTabScores
              :scan="scan"
              :check-config-snapshot="checkConfigSnapshot"
          />
        </div>

        <!-- Screenshots -->
        <div class="card" style="margin-top:12px;">
          <ScanTabScreenshots :scan="scan" />
        </div>

        <!-- Text -->
        <div v-if="checkConfigSnapshot?.text" class="card" style="margin-top:12px;">
          <ScanTabText :scan="scan" />
        </div>

        <!-- Links -->
        <div v-if="checkConfigSnapshot?.links" class="card" style="margin-top:12px;">
          <ScanTabLinks :scan="scan" />
        </div>


        <!-- SEO -->
        <div v-if="checkConfigSnapshot?.seo" class="card" style="margin-top:12px;">
          <ScanTabSeo :scan="scan" />
        </div>
      </div>
    </div>
  </details>
</template>
