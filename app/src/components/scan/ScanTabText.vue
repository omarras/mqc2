<script setup>
import TextDiff from "../TextDiff.vue";

const props = defineProps({
  scan: Object
});

// MQC2 structure:
// scan.text = { ops: [...], contentParity: {...}, rawOld, rawNew }
</script>

<template>
  <div>
    <h3>Text Comparison</h3>

    <div v-if="!scan.text">
      <p>No text comparison result available.</p>
      <p>This may happen if pageDataCheck aborted or checkConfig.text was disabled.</p>
      <pre>{{ scan }}</pre>
      <p>Enable “text” in checkConfig to see results.</p>
      <hr />
    </div>

    <div v-else>
      <!-- Use your existing TextDiff component -->
      <TextDiff
          :loading="false"
          :ops="scan.text.ops"
          :pair="{ old: scan.urls?.old, new: scan.urls?.new }"
      />

      <!-- MQC2 content parity summary -->
      <div style="margin-top:20px;">
        <h4>Content Parity Score</h4>
        <pre>{{ scan.text.contentParity }}</pre>
      </div>
    </div>
  </div>
</template>
