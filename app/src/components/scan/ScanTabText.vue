<!-- src/components/scan/ScanTabText.vue -->
<script setup>
import { computed, watch } from "vue";
import TextDiff from "../TextDiff.vue";
import RemarksBar from "../RemarksBar.vue";
import ReportDefectButton from "../ReportDefectButton.vue";

const props = defineProps({
  scan: { type: Object, required: true }
});

// ops / loading
const ops = computed(() => props.scan?.text?.ops || []);
const isLoading = computed(() => {
  const s = String(props.scan?.status || "").toLowerCase();
  return (s === "running" || s === "pending") && ops.value.length === 0;
});

// urls (pair)
const pair = computed(() => ({
  old: props.scan?.urls?.old || props.scan?.pageDataCheck?.urlOld || "",
  new: props.scan?.urls?.new || props.scan?.pageDataCheck?.urlNew || ""
}));

// show empty state if text missing
const hasTextResult = computed(() => !!props.scan?.text);

const pageDataCheck = computed(() =>
    props.scan?.pageDataCheck ||
    props.scan?.metadata?.pageDataCheck ||
    null
);

// pageDataCheck source
const metadata = computed(() => props.scan?.metadata || null);

const remarksPair = computed(() => {
  const m = metadata.value || {};
  return {
    remarksDS: m.remarksDS || "",
    remarksDSOverride: m.remarksDSOverride || "",
    remarksRegion: m.remarksRegion || "",
    remarks: m.remarks || ""
  };
});

const hasRemarks = computed(() =>
    Object.values(remarksPair.value).some(v => String(v).trim())
);
</script>

<template>
  <div v-if="!hasTextResult">
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

  <div v-else>
    <div class="card-header">
      <div class="card-header__left"></div>

      <h2 class="card-header__title">
        Text Comparison <span class="diff-title">(diff)</span>
      </h2>

      <div class="card-header__right">
        <ReportDefectButton :scan="scan" />
      </div>
    </div>

    <!-- IMPORTANT: no v-else here, we want both -->
    <RemarksBar
        v-if="hasRemarks"
        :pair="remarksPair"
    />

    <TextDiff
        :loading="isLoading"
        :ops="ops"
        :pair="pair"
        :showToggle="true"
    />
  </div>
</template>
