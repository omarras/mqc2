<!-- src/components/tabs/ScanTabScores.vue -->
<script setup>
import { computed } from "vue";
import GaugeMeter from "../GaugeMeter.vue";

const props = defineProps({
  scan: { type: Object, default: null },

  // IMPORTANT: pass this from run-level config (snapshot)
  checkConfigSnapshot: { type: Object, default: null }
});

const cfg = computed(() => props.checkConfigSnapshot || null);

function isEnabledGauge(gaugeKey) {
  // gaugeKey is: "text" | "links" | "seo"
  // run.checkConfigSnapshot is: { text: true, links: true, seo: false, ... }
  if (cfg.value) return cfg.value[gaugeKey] === true;

  // no config, show by default
  return true;
}

/* -----------------------------
   Normalization
----------------------------- */
function toPct(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n > 1) return Math.max(0, Math.min(100, Math.round(n)));
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}

/* -----------------------------
   MQC2 mapping
----------------------------- */
const textScore = computed(() => toPct(props.scan?.text?.contentParity?.score));
const linksScore = computed(() => toPct(props.scan?.links?.summary?.newScore));
const seoScore = computed(() => toPct(props.scan?.seo?.summary?.globalScore));

const gauges = computed(() => {
  const all = [
    { key: "text",  label: "Text parity",   value: textScore.value },
    { key: "links", label: "Link quality",  value: linksScore.value },
    { key: "seo",   label: "SEO quality",   value: seoScore.value }
  ];

  return all.filter(g => isEnabledGauge(g.key));
});


</script>

<template>
  <div class="card">
    <h2 class="quality-overview">Quality Scores</h2>

    <p v-if="!gauges.length" class="tiny muted" style="margin-top:6px;">
      No score checks enabled for this scan.
    </p>

    <div
        v-else
        class="gauge-grid"
        style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));"
    >
      <div v-for="g in gauges" :key="g.key" class="gauge-wrap">
        <GaugeMeter :label="g.label" :value="g.value" :size="168" />
      </div>
    </div>
  </div>
</template>
