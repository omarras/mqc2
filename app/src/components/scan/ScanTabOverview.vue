<script setup>
const props = defineProps({
  scan: Object
});

function getPhase(scan) {
  if (!scan.pageDataCheck) return "Starting";
  if (!scan.text && !scan.seo && !scan.links) return "Phase 1";
  return "Phase 2";
}
</script>

<template>
  <div>
    <h3>Overview</h3>

    <p><strong>Status:</strong> {{ scan.status }}</p>
    <p><strong>Phase:</strong> {{ getPhase(scan) }}</p>

    <p><strong>Old URL:</strong> {{ scan.urls?.old || scan.pageDataCheck?.urlOld }}</p>
    <p><strong>New URL:</strong> {{ scan.urls?.new || scan.pageDataCheck?.urlNew }}</p>

    <div>
      <strong>Scores:</strong>
      <ul>
        <li>Text Score: {{ scan.text?.contentParity?.score ?? "-" }}</li>
        <li>SEO Score: {{ scan.seo?.summary?.globalScore ?? "-" }}</li>
        <li>Links: {{ scan.links?.validCount ?? "-" }} valid</li>
      </ul>
    </div>

    <h4>Raw PageDataCheck</h4>
    <pre>{{ scan.pageDataCheck }}</pre>
  </div>
</template>
