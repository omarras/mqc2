<!--src/components/SingleInputs.vue-->

<script setup>
/**
 * SingleInputs.vue
 *
 * Props:
 *  - oldUrl        (String)
 *  - newUrl        (String)
 *  - oldUrlInvalid (Boolean)
 *  - newUrlInvalid (Boolean)
 *
 * Emits:
 *  - update:oldUrl
 *  - update:newUrl
 */

const props = defineProps({
  oldUrl: { type: String, required: true },
  newUrl: { type: String, required: true },
  oldUrlInvalid: { type: Boolean, default: false },
  newUrlInvalid: { type: Boolean, default: false }
});

const emit = defineEmits(["update:oldUrl", "update:newUrl"]);

function updateOld(e) {
  emit("update:oldUrl", e.target.value);
}

function updateNew(e) {
  emit("update:newUrl", e.target.value);
}
</script>

<template>
  <div class="grid grid-2">
    <div class="field">
      <label>AEM URL</label>
      <input
          :value="oldUrl"
          @input="updateOld"
          placeholder="https://www.philips.ie/"
          :class="{ 'input--invalid': oldUrlInvalid }"
      />
    </div>

    <div class="field">
      <label>Contentstack URL</label>
      <input
          :value="newUrl"
          @input="updateNew"
          placeholder="https://stg.philips.ie/"
          :class="{ 'input--invalid': newUrlInvalid }"
      />
    </div>
  </div>
</template>
