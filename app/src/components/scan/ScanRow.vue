<script setup>
import { ref } from "vue";

import ScanTabOverview from "./ScanTabOverview.vue";
import ScanTabText from "./ScanTabText.vue";
import ScanTabSeo from "./ScanTabSeo.vue";
import ScanTabLinks from "./ScanTabLinks.vue";
import ScanTabScreenshots from "./ScanTabScreenshots.vue";

const props = defineProps({
  scan: Object,   // normalized scan from store
  scanId: String, // key for display
});

const open = ref(false);
const activeTab = ref("overview");

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "text", label: "Text" },
  { key: "seo", label: "SEO" },
  { key: "links", label: "Links" },
  { key: "screenshots", label: "Screenshots" }
];

function toggle() {
  open.value = !open.value;
}
</script>

<template>
  <div class="scan-row">
    <div class="scan-header" @click="toggle">
      <strong>{{ scanId }}</strong>
      <span> | {{ scan.status }}</span>
      <span> | {{ (scan.urls?.old || scan.pageDataCheck?.urlOld) }}</span>
      <span> → {{ (scan.urls?.new || scan.pageDataCheck?.urlNew) }}</span>
    </div>

    <div v-if="open" class="scan-content">
      <div class="tabs">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <ScanTabOverview v-if="activeTab === 'overview'" :scan="scan" />
        <ScanTabText v-if="activeTab === 'text'" :scan="scan" />
        <ScanTabSeo v-if="activeTab === 'seo'" :scan="scan" />
        <ScanTabLinks v-if="activeTab === 'links'" :scan="scan" />
        <ScanTabScreenshots v-if="activeTab === 'screenshots'" :scan="scan" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-row {
  border: 1px solid #ccc;
  margin-bottom: 12px;
}

.scan-header {
  background: #f6f6f6;
  padding: 8px;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab {
  padding: 4px 8px;
  border: 1px solid #aaa;
  background: #eee;
  cursor: pointer;
}

.tab.active {
  background: white;
  border-bottom: 2px solid black;
}

.tab-content {
  padding: 12px;
  border-top: 1px solid #ddd;
}
</style>
