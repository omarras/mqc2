<!-- src/components/scan/ScanTabText.vue -->
<script setup>
import { computed } from "vue";
import TextDiff from "../TextDiff.vue";

const props = defineProps({
  scan: { type: Object, required: true }
});

// MQC2 mapping stays the same:
const ops = computed(() => props.scan?.text?.ops || []);

// If you have a text flag/phase, use that. Otherwise fallback to status.
const isLoading = computed(() => {
  // If scan is still running and text result not present yet, show MQC1 loader UI
  const s = String(props.scan?.status || "").toLowerCase();
  return (s === "running" || s === "pending") && ops.value.length === 0;
});

// Pair is used by RemarksBar in MQC1 component
const pair = computed(() => ({
  old: props.scan?.urls?.old || props.scan?.pageDataCheck?.urlOld || "",
  new: props.scan?.urls?.new || props.scan?.pageDataCheck?.urlNew || ""
}));

const hasTextResult = computed(() => {
  // If backend returns scan.text but ops are empty, we still show the component,
  // because MQC1 can show empty table + controls.
  return !!props.scan?.text;
});
</script>

<template>
  <!-- If the check hasn't produced scan.text at all -->
  <div v-if="!hasTextResult">
    <!-- Use the same loader placeholder styling used elsewhere (MQC1 style) -->
    <div v-if="isLoading" class="shot--placeholder" style="height:160px;">
      <div class="loader"></div>
      <div class="tiny muted" style="margin-top:6px;">Loading diff…</div>
    </div>

    <div v-else class="card">
      <h2>Text Comparison <span class="diff-title">(diff)</span></h2>
      <p class="muted" style="margin-top:6px;">
        No text comparison result available.
        This can happen if the scan aborted early or the text check was disabled.
      </p>
    </div>
  </div>

  <!-- Normal case: use MQC1 component as-is -->
  <TextDiff
      v-else
      :loading="isLoading"
      :ops="ops"
      :pair="pair"
      :showToggle="true"
  />
</template>
