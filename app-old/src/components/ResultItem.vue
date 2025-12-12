<!--src/components/Results/ResultItem.vue-->
<script setup>
import {computed, ref} from "vue";
import GaugeMeter from "./GaugeMeter.vue";
import Screenshots from "./Screenshots.vue";
import TextDiff from "./TextDiff.vue";
import LinkChecker from "./LinkChecker.vue";
import Seo from "./Seo.vue";
import Performance from "./Performance.vue";
import BestPractices from "./BestPractices.vue";
import Accessibility from "./Accessibility.vue";
import MobileFrame from "./MobileFrame.vue";
import MobileModal from "./MobileModal.vue";

const emit = defineEmits(['compare'])

const mobileOpen = ref(false)
const mobileSrc = ref(null)

function openMobileModal(src) {
  mobileSrc.value = src
  mobileOpen.value = true
}

const mobileImagePath = computed(() => {
  const raw = props.result?.screenshots?.newMobilePngPath || null;
  console.log("[ResultItem] mobileImagePath =", raw);
  return raw;
});

function onCompare(payload) {
  emit('compare', payload)
}

const props = defineProps({
  result: { type: Object, required: true },
  index: { type: Number, required: false }, // for bulk results
  isSingle: { type: Boolean, required: true }, // results.length === 1
  toggles: { type: Object, required: true },

  visibleGauges: { type: Array, required: true },
  gauges: { type: Object, required: true },
  gaugeCols: { type: String, required: true },

  scoreBadgeClass: Function,
  isGaugeLoading: Function,
  num: Function,

  // loading flags
  flags: Object,
  bpData: Object,
  bpLoading: Boolean,
  linkData: Object,
  linkLoading: Boolean,
  seoRuleRows: Array
});

// Auto-expand if single result
const open = props.isSingle;
</script>

<template>
  <details class="accordion" :open="open">
    <summary class="acc-summary">
      <div class="acc-title">

        <!-- caret icon -->
        <span class="acc-caret" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" class="chev">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>

        <!-- index (bulk mode only) -->
        <span v-if="!isSingle" class="mono muted">
          #{{ index }}
        </span>
        <span v-if="!isSingle" class="acc-arrow" style="opacity:.35; margin:0 6px;">•</span>

        <!-- URLs -->
        <a class="acc-url mono"
           :href="result.oldUrl"
           :title="result.oldUrl"
           target="_blank" rel="noopener noreferrer">
          {{ result.oldUrl || "—" }}
        </a>
        <span class="acc-arrow">→</span>
        <a class="acc-url mono"
           :href="result.newUrl"
           :title="result.newUrl"
           target="_blank" rel="noopener noreferrer">
          {{ result.newUrl || "—" }}
        </a>
      </div>

      <!-- Gauges overview -->
      <div class="acc-metrics" role="group" aria-label="Scores overview">
        <div class="acc-metrics-head">
          <span
              v-for="g in visibleGauges"
              :key="'head-' + g.key"
              class="head-col"
          >
            {{ g.short }}
          </span>
        </div>

        <div class="acc-metrics-row">
          <span
              v-for="g in visibleGauges"
              :key="'val-' + g.key"
              class="val-col"
              :class="scoreBadgeClass(gauges[g.key])"
          >
            <span v-if="num(gauges[g.key]) != null">
              {{ num(gauges[g.key]) }}%
            </span>
            <span v-else>—</span>

            <span
                v-if="isGaugeLoading(g.key)"
                class="dot-loader"
                aria-label="loading"
            ></span>
          </span>
        </div>
      </div>

    </summary>

    <div class="acc-content">
      <!-- Big gauges card -->
      <div class="card" v-if="visibleGauges.length">
        <h2 class="quality-overview">Migration & Platform Quality Overview</h2>

        <div class="gauge-grid" :style="{ gridTemplateColumns: gaugeCols }">
          <div
              v-for="g in visibleGauges"
              :key="'gauge-' + g.key"
              class="gauge-wrap"
              :class="{ loading: isGaugeLoading(g.key) }"
          >
            <GaugeMeter :label="g.label" :value="gauges[g.key]" :size="168" />
            <div v-if="isGaugeLoading(g.key)" class="gauge__loader">
              <div class="loader"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Feature panels -->
      <Screenshots
          v-if="toggles['screenshot-desktop']"
          :loading="result.shotsLoading"
          :old-src="result.screenshots?.oldPngPath"
          :new-src="result.screenshots?.newPngPath"
          :old-url="result.oldUrl"
          :new-url="result.newUrl"
          @compare="onCompare"
      />

      <MobileFrame
          :src="result.screenshots.newMobilePngPath"
          :loading="result.mobileLoading"
          @open="openMobileModal"
      />

      <MobileModal
          :open="mobileOpen"
          :src="result.screenshots.newMobilePngPath"
          :loading="result.mobileLoading"
          @close="mobileOpen = false"
      />

      <TextDiff
          v-if="toggles['text-comparison']"
          :loading="!flags?.text"
          :ops="result.content?.textDiff || []"
      />

      <LinkChecker
          :loading="linkLoading"
          :data="linkData"
          :toggles="toggles"
      />

      <Seo
          v-if="toggles['seo']"
          :loading="!flags.seo"
          :seo="result.seo"
          :rules="seoRuleRows"
      />

      <Performance
          v-if="toggles['performance']"
          :loading="!flags.performance"
          :performance="result.performance"
      />

      <BestPractices
          v-if="toggles['best-practices']"
          :loading="bpLoading"
          :data="bpData"
          hide-info
      />

      <Accessibility
          v-if="toggles['accessibility']"
          :loading="!flags.accessibility"
          :a11y="result.a11y"
      />

      <p v-if="result.error" class="error" style="margin-top:8px;">
        {{ result.error }}
      </p>
    </div>
  </details>
</template>
