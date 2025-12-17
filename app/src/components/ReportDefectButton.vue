<script setup>
import { computed } from "vue";

const props = defineProps({
  scan: { type: Object, required: true },
  side: { type: String, default: "new" }
});

const BASE = "https://www.digitalcampaigncreator.philips.com/feedback";

function pickNoCacheUrl(scan, side) {
  const pdc =
      scan?.pageDataCheck ||
      scan?.metadata?.pageDataCheck ||
      null;

  const key = side === "old" ? "urlOld" : "urlNew";

  return (
      pdc?.[key]?.noCacheUrl ||
      pdc?.[key]?.originalUrl ||
      scan?.urls?.[side] ||
      ""
  );
}

const targetUrl = computed(() => pickNoCacheUrl(props.scan, props.side));

function openReport() {
  if (!targetUrl.value) return;

  const url = `${BASE}?isurlpaste=${encodeURIComponent(targetUrl.value)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <button
      v-if="targetUrl"
      type="button"
      class="btn btn--sm btn--outline report-defect-btn"
      @click.stop="openReport"
  >
    <svg viewBox="0 0 22 22" class="sub-icon" aria-hidden="true" focusable="false">
      <path d="m15.3 14.89l2.77 2.77a1 1 0 0 1 0 1.41a1 1 0 0 1-1.41 0l-2.59-2.58A5.99 5.99 0 0 1 11 18V9.04a1 1 0 0 0-2 0V18a5.98 5.98 0 0 1-3.07-1.51l-2.59 2.58a1 1 0 0 1-1.41 0a1 1 0 0 1 0-1.41l2.77-2.77A5.95 5.95 0 0 1 4.07 13H1a1 1 0 1 1 0-2h3V8.41L.93 5.34a1 1 0 0 1 0-1.41a1 1 0 0 1 1.41 0l2.1 2.1h11.12l2.1-2.1a1 1 0 0 1 1.41 0a1 1 0 0 1 0 1.41L16 8.41V11h3a1 1 0 1 1 0 2h-3.07c-.1.67-.32 1.31-.63 1.89zM15 5H5a5 5 0 1 1 10 0z"></path>
    </svg>
    <span>Report a bug</span>
  </button>
</template>

<style scoped>
.report-defect-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5em; /* space between icon and text */
  background: rgb(171 38 77 / 50%);
}

.report-defect-btn .sub-icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  flex: 0 0 auto;
  fill: currentColor;      /* icon color matches text */
  vertical-align: -0.125em; /* optional: nudge baseline */
}
</style>