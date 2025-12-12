<!--src/components/RemarksBar.vue-->

<template>
  <div v-if="hasAny" class="alert alert--amber">
    <h3 class="alert__title">Migration Remarks</h3>
    <div class="alert__items" :style="{ '--cols': cols }">
      <div v-for="row in visibleItems" :key="row.key" class="alert__item">
        <span class="alert__key">{{ row.label }}</span>
        <span class="alert__val">{{ row.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const cols = computed(() => Math.max(1, Math.min(4, visibleItems.value.length)));

const props = defineProps({
  pair: { type: Object, required: true }
})

const LABELS = {
  remarksDSOverride: 'Digital Services Override Remarks',
  remarksDS:         'Digital Services Remarks',
  remarksRegion:     'Region Remarks',
  remarks:           'General Remarks',
}

const visibleItems = computed(() => {
  const out = []
  for (const [key, label] of Object.entries(LABELS)) {
    const val = props.pair?.[key]
    if (val && String(val).trim()) out.push({ key, label, value: String(val).trim() })
  }
  return out
})

const hasAny = computed(() => visibleItems.value.length > 0)
</script>
