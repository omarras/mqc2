<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
});

const emit = defineEmits(["update:modelValue"]);

function setMode(mode) {
  if (mode !== props.modelValue) {
    emit("update:modelValue", mode);
  }
}

function onKey(e) {
  const order = ["single", "bulk", "fetch"];
  const idx = order.indexOf(props.modelValue);

  if (e.key === "ArrowRight") {
    emit("update:modelValue", order[(idx + 1) % order.length]);
  }

  if (e.key === "ArrowLeft") {
    emit("update:modelValue", order[(idx - 1 + order.length) % order.length]);
  }
}
</script>

<template>
  <div class="segmented card" role="radiogroup" aria-label="Run mode">
    <div
        class="seg-track"
        tabindex="0"
        :style="{
          '--seg-count': 3,
          '--seg-index': ['single','bulk','fetch'].indexOf(modelValue)
        }"
        @keydown="onKey"
    >
    <div class="seg-thumb" :class="modelValue" aria-hidden="true"></div>

      <button
          class="seg-btn"
          role="radio"
          :aria-checked="modelValue === 'single'"
          :class="{ active: modelValue === 'single' }"
          @click="setMode('single')"
      >
        Manual
      </button>

      <button
          class="seg-btn"
          role="radio"
          :aria-checked="modelValue === 'bulk'"
          :class="{ active: modelValue === 'bulk' }"
          @click="setMode('bulk')"
      >
        CSV Upload
      </button>

      <button
          class="seg-btn"
          role="radio"
          :aria-checked="modelValue === 'fetch'"
          :class="{ active: modelValue === 'fetch' }"
          @click="setMode('fetch')"
      >
        From Dashboard
      </button>
    </div>

  </div>
</template>
