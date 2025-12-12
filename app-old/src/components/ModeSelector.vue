<!--src/components/ModeSelector.vue-->

<script setup>
/**
 * Props:
 *  - modelValue: current runMode ('single' | 'bulk' | 'fetch')
 * Emits:
 *  - update:modelValue → parent updates runMode
 *
 *  - keydown handling is delegated to parent via optional onSegKey if needed
 */

const props = defineProps({
  modelValue: { type: String, required: true }
});

const emit = defineEmits(["update:modelValue"]);

function setMode(m) {
  emit("update:modelValue", m);
}

function onKey(e) {
  emit("keydown", e);
}
</script>

<template>
  <div class="segmented card" role="radiogroup" aria-label="Mode">
    <div class="seg-track" @keydown="onKey">
      <div class="seg-thumb" :class="modelValue" aria-hidden="true"></div>

      <button
          class="seg-btn"
          role="radio"
          :aria-checked="modelValue==='single'"
          :class="{ active: modelValue==='single' }"
          @click="setMode('single')"
      >
        Manual
      </button>

      <button
          class="seg-btn"
          role="radio"
          :aria-checked="modelValue==='bulk'"
          :class="{ active: modelValue==='bulk' }"
          @click="setMode('bulk')"
      >
        CSV Upload
      </button>

      <button
          class="seg-btn"
          role="radio"
          :aria-checked="modelValue==='fetch'"
          :class="{ active: modelValue==='fetch' }"
          @click="setMode('fetch')"
      >
        From Dashboard
      </button>
    </div>
  </div>
</template>
