<script setup>
import { computed, ref } from "vue";

import ScanTabOverview from "./ScanTabOverview.vue";
import ScanTabScores from "./ScanTabScores.vue";
import ScanTabScreenshots from "./ScanTabScreenshots.vue";
import ScanTabText from "./ScanTabText.vue";
import ScanTabLinks from "./ScanTabLinks.vue";
import ScanTabSeo from "./ScanTabSeo.vue";
import DsStatusDropdown from "./DsStatusDropdown.vue";

const emit = defineEmits(["toggle"]);

const props = defineProps({
  scan: { type: Object, required: true },
  scanId: { type: String, default: "" },
  runId: { type: String, required: true },
  open: { type: Boolean, default: false },
  index: { type: Number, default: -1 },
  checkConfigSnapshot: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false }
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
const shouldContinue = computed(() => {
  // backend truth, prefer scan.pageDataCheck, fallback metadata.pageDataCheck
  return Boolean(
      pageDataCheck.value?.shouldContinue ??
      metaPageDataCheck.value?.shouldContinue ??
      false
  );
});

const stoppedReason = computed(() => {
  // figure out the most likely reason based on status codes
  const o = Number(oldHttpStatus.value);
  const n = Number(newHttpStatus.value);

  const isRedirect = (x) => Number.isFinite(x) && x >= 300 && x < 400;
  const isBad = (x) => Number.isFinite(x) && x !== 200 && !isRedirect(x);

  if (isRedirect(o) || isRedirect(n)) return "redirect";
  if (isBad(o) || isBad(n)) return "unreachable";
  return "unreachable";
});

const stoppedTitle = computed(() => "Analysis stopped early");

const stoppedText = computed(() => {
  if (stoppedReason.value === "redirect") {
    return "We only ran the basic page check because one of the URLs redirected to a different page.";
  }
  return "We only ran the basic page check because one of the URLs could not be reached.";
});

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

const dsStatusRaw = computed(() =>
    props.scan?.dsStatusRaw ??
    props.scan?.metadata?.dsStatus ??
    null
);

const uatStatus = computed(() =>
    props.scan?.uatStatus ?? "unknown"
);

const uatStatusLabel = computed(() => {
  const s = String(uatStatus.value || "").toLowerCase();

  if (s === "ready") return "Ready for UAT";
  if (s === "feedback") return "UAT feedback provided";
  if (s === "approved") return "UAT approved";

  // fallback: show what DS gave us
  return dsStatusRaw.value || "DS status unknown";
});

function uatBadgeClass() {
  const s = String(dsStatusRaw.value || "").trim().toLowerCase();

  if (s.includes("uat approved")) return "badge badge--ok";        // green
  if (s.includes("uat feedback")) return "badge badge--neutral";  // amber
  if (s.includes("ready for uat")) return "badge badge--info";    // blue

  return "badge badge--bad"; // unexpected DS state
}

function onSummaryClick(e) {
  // If click originated from DS dropdown, do nothing
  if (e.target.closest(".ds-dropdown")) {
    return;
  }

  e.preventDefault();
  requestToggle();
}
</script>

<template>
  <details class="accordion" :open="open">
    <!-- CONTROLLED: prevent native toggle, delegate to parent -->
    <summary class="acc-summary" @click="onSummaryClick">
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
            {{ index }}
          </span>

          <div class="acc-main">
            <div v-if="newTitle && newTitle !== 'UNKNOWN'" class="acc-page">
              <span class="acc-page-title">{{ newTitle || "UNKNOWN" }}</span>
            </div>

            <div class="acc-urls">
              <a v-if="oldUrl" class="acc-url mono muted" target="_blank" :href="oldNoCacheUrl" @click.stop>{{ oldUrl }}</a>
              <span v-else class="acc-url mono muted">—</span>

              <span class="acc-arrow">→</span>

              <a v-if="newUrl" class="acc-url mono muted" target="_blank" :href="newNoCacheUrl" @click.stop>{{ newUrl }}</a>
            </div>
          </div>
        </div>

        <!-- RIGHT: status -->
        <div class="acc-chips" @click.stop>
          <!-- RIGHT: status -->
          <div class="acc-chips" @click.stop>
            <DsStatusDropdown
                v-if="!props.isAdmin"
                :scan="scan"
                :run-id="runId"
                :scan-id="scanId"
                :badge-class="uatBadgeClass()"
            />

            <span
                v-else
                class="result-status"
                :class="statusBadgeClass(status)"
            >
              {{ statusLabel }}
            </span>
            <slot name="adminActions" />
          </div>
          <slot name="adminActions" />
        </div>
      </div>
    </summary>

    <div class="segmented card" role="radiogroup" aria-label="Scan tabs">
      <div class="acc-content">
        <!-- Overview always -->
        <div class="card" style="margin-top:12px;">
          <ScanTabOverview
              :scan="scan"
              :run-id="props.runId"
              :scan-id="scanId"
          />
        </div>

        <!-- Everything else only if shouldContinue -->
        <template v-if="shouldContinue">
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
        </template>

        <!-- Optional: a small note when checks are skipped -->
        <div v-else class="alert alert--bad" style="margin-top:12px;">
          <h3 class="alert__title">Analysis stopped early.</h3>

          <p class="alert__text">
            We couldn’t fully check this page because one of the URLs was not reachable, or it redirected to a different page.
          </p>
        </div>

      </div>
    </div>
  </details>
</template>
