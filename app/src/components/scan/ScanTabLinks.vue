<!-- src/components/scan/ScanTabLinks.vue -->
<script setup>
import { computed, ref } from "vue";
import ReportDefectButton from "../ReportDefectButton.vue";

const props = defineProps({
  scan: { type: Object, default: null }
});

/* -----------------------------------------------------------
   NORMALIZE MQC2 SHAPE -> MQC1-LIKE MODEL
----------------------------------------------------------- */
const payload = computed(() => {
  const links = props.scan?.links;
  if (!links) return null;

  // MQC2 commonly: { old: {...}, new: {...}, summary: {...} }
  if (links.old && links.new) return { old: links.old, new: links.new };

  // fallback if your mapping uses aem/contentstack names
  if (links.aem && links.contentstack) return { old: links.aem, new: links.contentstack };

  return null;
});

function extractLinks(obj) {
  if (!obj) return [];
  return obj.allLinks || obj.links || [];
}

const normalized = computed(() => {
  if (!payload.value) return null;

  const oldLinks = extractLinks(payload.value.old);
  const newLinks = extractLinks(payload.value.new);

  const oldScoreRaw = payload.value.old?.score ?? props.scan?.links?.summary?.oldScore ?? 1;
  const newScoreRaw = payload.value.new?.score ?? props.scan?.links?.summary?.newScore ?? 1;

  return {
    aem: {
      links: oldLinks,
      score: Math.round(Number(oldScoreRaw) * 100)
    },
    contentstack: {
      links: newLinks,
      score: Math.round(Number(newScoreRaw) * 100)
    }
  };
});

const aem = computed(() => normalized.value?.aem || null);
const cs = computed(() => normalized.value?.contentstack || null);

const loading = computed(() => {
  // if you have an explicit flag in MQC2, use it instead
  return !props.scan?.links || !cs.value;
});

const ready = computed(() => !!cs.value && !loading.value);

/* -----------------------------------------------------------
   TABLE ROWS, FILTERING
----------------------------------------------------------- */
const rows = computed(() => {
  if (!cs.value) return [];
  return cs.value.links.map((l) => ({
    url: l.url,
    type: l.type || "external",
    initialStatus: l.initialStatus,
    finalStatus: l.finalStatus,
    redirected: !!l.redirected,
    finalUrl: l.finalUrl,
    secure: l.secure,
    score: l.score,
    outcome: l.outcome
  }));
});

const showAll = ref(false);

const problemRows = computed(() =>
    rows.value.filter((r) => r.outcome !== "success")
);

const filteredRows = computed(() =>
    showAll.value ? rows.value : problemRows.value
);

/* -----------------------------------------------------------
   UI HELPERS (same as MQC1)
----------------------------------------------------------- */
function outcomeIcon(row) {
  if (row.outcome === "success") return { icon: "✓", cls: "badge2 badge--ok" };
  if (row.outcome === "warning") return { icon: "!", cls: "badge2 badge--neutral" };
  return { icon: "✖", cls: "badge2 badge--bad" };
}

function statusLabel(s) {
  const n = Number(s);
  if (n === 200) return "OK";
  if (n >= 300 && n < 400) return "Redirect";
  if (!s) return "Unknown";
  return s;
}

function pctClass(score) {
  const n = Number(score || 0);
  if (n >= 90) return "meter--great";
  if (n >= 50) return "meter--warn";
  return "meter--bad";
}

const isPerfectScore = computed(() => {
  return Number(cs.value?.score || 0) >= 100;
});

const showPerfectMessage = computed(() => {
  return ready.value && !showAll.value && filteredRows.value.length === 0;
});


</script>

<template>
  <div class="card">
    <div class="card-header">
      <div class="card-header__left"></div>

      <h2 class="card-header__title">
        Page Link Checker
      </h2>

      <div class="card-header__right">
        <ReportDefectButton :scan="scan" />
      </div>
    </div>

    <div v-if="!ready" class="shot--placeholder" style="height:160px;">
      <div class="loader"></div>
      <div class="tiny muted" style="margin-top:6px;">Loading link data…</div>
    </div>

    <template v-else>
      <!-- SUMMARY (AEM & Contentstack) -->
      <div class="grid grid-2 summary" style="margin-top:8px;">
        <div class="sum-card">
          <div class="sum-card__label">Links (AEM)</div>
          <div class="sum-card__num">{{ aem.links.length }} total</div>

          <div class="tiny muted">Link Quality Score</div>
          <div class="meter" :class="pctClass(aem.score)">
            <div class="meter__bar" :style="{ width: aem.score + '%' }"></div>
          </div>
        </div>

        <div class="sum-card">
          <div class="sum-card__label">Links (Contentstack)</div>
          <div class="sum-card__num">{{ cs.links.length }} total</div>

          <div class="tiny muted">Link Quality Score</div>
          <div class="meter" :class="pctClass(cs.score)">
            <div class="meter__bar" :style="{ width: cs.score + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Links "table" -->
      <div class="subcard">
        <h4 style="margin: 12px 0;">Links <span class="muted">(Contentstack)</span></h4>

        <div class="show-all" style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <div class="tiny muted">
            Showing <strong>{{ filteredRows.length }}</strong> of <strong>{{ rows.length }}</strong> links
            <span v-if="!showAll">, filtering to warnings and errors</span>
          </div>

          <label class="tgl" title="Show all content">
            <input type="checkbox" v-model="showAll">
            <span class="tgl__ui">
        <span class="tgl__switch" aria-hidden="true">
          <span class="tgl__track"></span>
          <span class="tgl__thumb"></span>
        </span>
        <span class="tgl__text">Show all links</span>
      </span>
          </label>
        </div>

        <!-- EMPTY / PERFECT MESSAGE (default when showAll is OFF and no issues) -->
        <div v-if="showPerfectMessage" class="links-perfect">
          <div class="links-perfect__icon">✓</div>

          <div class="links-perfect__content">
            <div class="links-perfect__title">All links are secure and work perfectly</div>
            <div class="tiny muted">
              No warnings or errors found.
            </div>
          </div>
        </div>

        <!-- ONLY show header + rows when showAll is ON -->
        <div v-else class="seo-table">
          <!-- header -->
          <div class="seo-row seo-head" role="row">
            <div class="seo-cell url" role="columnheader">URL</div>
            <div class="seo-cell type" role="columnheader">Type</div>
            <div class="seo-cell status" role="columnheader">Status</div>
            <div class="seo-cell tinycol seo-center" role="columnheader">Secure</div>
            <div class="seo-cell tinycol seo-center" role="columnheader">Success</div>
          </div>

          <!-- body -->
          <div
              v-for="(r, i) in filteredRows"
              :key="r.url + i"
              class="seo-row"
              role="row"
          >
            <!-- URL -->
            <div class="seo-cell url" role="cell">
              <a :href="r.url" target="_blank" class="mono seo-ellipsis" :title="r.url">
                {{ r.url }}
              </a>

              <div v-if="r.redirected" class="tiny muted mono seo-subline">
                → final URL:
                <a :href="r.finalUrl" target="_blank" class="seo-ellipsis" :title="r.finalUrl">
                  {{ r.finalUrl }}
                </a>
              </div>
            </div>

            <!-- TYPE -->
            <div class="seo-cell type mono" role="cell">
              <span class="seo-ellipsis" :title="r.type">{{ r.type }}</span>
            </div>

            <!-- STATUS -->
            <div class="seo-cell status mono" role="cell">
              <div class="seo-statusline">
                <span class="seo-ellipsis" :title="String(r.initialStatus)">{{ r.initialStatus }}</span>
                <span class="muted seo-ellipsis" :title="statusLabel(r.initialStatus)">
            ({{ statusLabel(r.initialStatus) }})
          </span>
              </div>

              <div v-if="r.redirected && r.finalUrl" class="tiny muted mono seo-subline">
                final: {{ r.finalStatus }} ({{ statusLabel(r.finalStatus) }})
              </div>
            </div>

            <!-- SECURE -->
            <div class="seo-cell tinycol seo-center" role="cell">
        <span :class="['badge', r.secure ? 'badge--ok' : 'badge--bad']">
          {{ r.secure ? "✓" : "✖" }}
        </span>
            </div>

            <!-- SUCCESS -->
            <div class="seo-cell tinycol seo-center" role="cell">
        <span :class="['badge', outcomeIcon(r).cls]">
          {{ outcomeIcon(r).icon }}
        </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
