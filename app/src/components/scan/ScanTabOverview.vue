<script setup>
import { computed } from "vue";
import { prettyFromCodes } from "../../utils/codeLookups.js";

const props = defineProps({
  scan: { type: Object, default: null },
  runId: { type: String, required: true }, // ✅ add
  scanId: { type: String, required: true } // ✅ add
});

/* ---- existing code below unchanged ---- */
const oldObj = computed(() => props.scan?.pageDataCheck?.urlOld || null);
const newObj = computed(() => props.scan?.pageDataCheck?.urlNew || null);

const oldUrl = computed(() => oldObj.value?.originalUrl || props.scan?.urls?.old || "-");
const newUrl = computed(() => newObj.value?.originalUrl || props.scan?.urls?.new || "-");

const title = computed(() => newObj.value?.title || "");

function statusBadge(code) {
  const n = Number(code);
  if (!Number.isFinite(n)) return "badge--neutral";
  if (n === 200) return "badge--ok";
  if (n >= 300 && n < 400) return "badge--neutral";
  return "badge--bad";
}

function statusText(code) {
  const n = Number(code);
  if (!Number.isFinite(n)) return "n/a";
  return String(n);
}

function platformText(p) {
  return p ? String(p) : "-";
}

function isRealUrl(u) {
  return typeof u === "string" && u.startsWith("http");
}

const pretty = computed(() =>
    prettyFromCodes({
      countryCode: newObj.value?.countryCode,
      languageCode: newObj.value?.languageCode,
      locale: newObj.value?.locale
    })
);

const flagSrc = computed(() => {
  const key = pretty.value?.flag;
  if (!key) return "";
  try {
    return new URL(`../../assets/flags/${key}.svg`, import.meta.url).href;
  } catch {
    return "";
  }
});
</script>

<template>
  <div class="shot__header">
    <h2>Page Analysis</h2>
  </div>

  <!-- rest of your template stays the same -->
  <div class="page-analysis-top">
    <div v-if="title" style="margin-bottom: 10px; text-align: left;">
      <span class="muted tiny">Page Title: </span>
      <span style="font-weight: 800; color: var(--ink); margin-left: 5px;">{{ title }}</span>
    </div>

    <div
        v-if="pretty.country || pretty.language"
        style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 12px;"
    >
      <span v-if="pretty.country" class="chip-score">
        <span class="muted">Country</span>
        <span class="chip-value" style="display:inline-flex; align-items:center; gap:8px;">
          <img
              v-if="flagSrc"
              :src="flagSrc"
              alt=""
              width="16"
              height="12"
              style="border-radius:2px; object-fit:cover;"
          />
          {{ pretty.country }}
        </span>
      </span>

      <span v-if="pretty.language" class="chip-score">
        <span class="muted">Language</span>
        <span class="chip-value">{{ pretty.language }}</span>
      </span>
    </div>
  </div>

  <div class="grid grid-2">
    <!-- OLD -->
    <div class="sum-card" style="text-align:left;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div class="sum-card__label">AEM URL</div>
        <span class="badge" :class="statusBadge(oldObj?.httpStatus)">
          {{ statusText(oldObj?.httpStatus) }}
        </span>
      </div>

      <div style="margin-top: 10px;">
        <div class="muted tiny" style="margin-bottom: 6px;">URL</div>
        <div class="mono">
          <a v-if="isRealUrl(oldUrl)" :href="oldUrl" target="_blank" rel="noreferrer">
            {{ oldUrl }} <span class="ext">↗</span>
          </a>
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div class="muted tiny" style="margin-bottom: 6px;">Platform (detected)</div>
        <span class="pill" style="background: var(--chip); border: 1px solid var(--border); color: var(--ink);">
          {{ platformText(oldObj?.platform) }}
        </span>
      </div>
    </div>

    <!-- NEW -->
    <div class="sum-card" style="text-align:left;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div class="sum-card__label">Contentstack URL</div>
        <span class="badge" :class="statusBadge(newObj?.httpStatus)">
          {{ statusText(newObj?.httpStatus) }}
        </span>
      </div>

      <div style="margin-top: 10px;">
        <div class="muted tiny" style="margin-bottom: 6px;">URL</div>
        <div class="mono">
          <a v-if="isRealUrl(newUrl)" :href="newUrl" target="_blank" rel="noreferrer">
            {{ newUrl }} <span class="ext">↗</span>
          </a>
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div class="muted tiny" style="margin-bottom: 6px;">Platform (detected)</div>
        <span class="pill" style="background: var(--chip); border: 1px solid var(--border); color: var(--ink);">
          {{ platformText(newObj?.platform) }}
        </span>
      </div>
    </div>
  </div>
</template>
