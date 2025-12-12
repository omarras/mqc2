<!--src/components/Results/ResultsPanel.vue-->
<script setup>
import {computed, ref} from "vue";
import ResultItem from "./ResultItem.vue";

const emit = defineEmits(['compare'])

function onComparePanel(payload) {
  console.log('[ResultsPanel] received compare', payload)
  emit('compare', payload)
  console.log('[ResultsPanel] forwarded compare')
}

const props = defineProps({
  results: { type: Array, required: true },

  // Everything passed down to each ResultItem
  toggles: Object,
  visibleGauges: Array,
  gaugeCols: String,
  scoreBadgeClass: Function,
  num: Function,

  // used by each result
  computeGauges: Function,     // parent computes gauges per item
  flagsFor: Function,          // parent computes flags per item
  bpDataFor: Function,
  bpLoadingFor: Function,
  linkDataFor: Function,
  linkLoadingFor: Function,
  seoRowsFor: Function,

  gaugeLoadingFor: Function
});

const isSingle = computed(() => props.results.length === 1);
</script>

<template>
  <section class="results" v-if="results.length">
    <ResultItem
        v-for="(res, idx) in results"
        :key="idx"
        :result="res"
        :index="idx"
        :isSingle="isSingle"
        :toggles="toggles"
        :visibleGauges="visibleGauges"
        :gaugeCols="gaugeCols"
        :gauges="computeGauges(res)"
        :flags="flagsFor(res)"
        :bpData="bpDataFor(res)"
        :bpLoading="bpLoadingFor(res)"
        :linkData="linkDataFor(res)"
        :linkLoading="linkLoadingFor(res)"
        :seoRuleRows="seoRowsFor(res)"
        :scoreBadgeClass="scoreBadgeClass"
        :isGaugeLoading="(key) => gaugeLoadingFor(res, key)"
        :num="num"
        @compare="onComparePanel"
    />
  </section>
</template>
