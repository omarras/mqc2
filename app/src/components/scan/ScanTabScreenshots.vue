<script setup>
import { computed, ref } from "vue";

import Screenshots from "../Screenshots.vue";     // MQC1 desktop component (with compare emit)
import MobileFrame from "../MobileFrame.vue";     // MQC1 phone frame
import MobileModal from "../MobileModal.vue";     // MQC2/MQC1 mobile modal (you already have)
import CompareModal from "../CompareModal.vue";   // your existing desktop compare modal

const props = defineProps({
  scan: { type: Object, default: null }
});

/* -----------------------------------------------------------
   MQC2 FIELD MAPPING (only this part matters)
----------------------------------------------------------- */

// Desktop AEM image
const desktopOldSrc = computed(() => {
  const s = props.scan || {};
  return (
      s.screenshots?.desktop?.aem?.imagePath ||
      s.visualComparisonDesktop?.aem?.imagePath ||
      null
  );
});

// Desktop Contentstack image
const desktopNewSrc = computed(() => {
  const s = props.scan || {};
  return (
      s.screenshots?.desktop?.contentstack?.imagePath ||
      s.visualComparisonDesktop?.contentstack?.imagePath ||
      null
  );
});

// Mobile Contentstack image
const mobileSrc = computed(() => {
  const s = props.scan || {};
  return (
      s.screenshots?.mobile?.contentstackMobile?.imagePath ||
      s.screenshotMobile?.contentstackMobile?.imagePath ||
      null
  );
});

/* -----------------------------------------------------------
   URLs (prefer noCacheUrl if present)
----------------------------------------------------------- */
const pageDataCheck = computed(() => props.scan?.pageDataCheck || null);

const oldUrl = computed(() => {
  // prefer noCacheUrl, fallback to original urlOld string
  return (
      pageDataCheck.value?.urlOld?.noCacheUrl ||
      pageDataCheck.value?.urlOld?.originalUrl ||
      props.scan?.urls?.old ||
      props.scan?.pageDataCheck?.urlOld || // in case your normalized shape is string
      null
  );
});

const newUrl = computed(() => {
  return (
      pageDataCheck.value?.urlNew?.noCacheUrl ||
      pageDataCheck.value?.urlNew?.originalUrl ||
      props.scan?.urls?.new ||
      props.scan?.pageDataCheck?.urlNew ||
      null
  );
});

const metadata = computed(() => props.scan?.metadata || null);

const contentstackEditUrl = computed(() => {
  return (
      metadata.value?.contentStackUrl ||
      metadata.value?.contentstackEditUrl || // optional fallback if naming differs
      null
  );
});

// MQC1 Screenshots.vue expects: pair.contentstackEditUrl
const pair = computed(() => {
  if (!contentstackEditUrl.value) return null;
  return { contentstackEditUrl: contentstackEditUrl.value };
});


/* -----------------------------------------------------------
   Loading flags (keep lightweight, adapt if you have better flags)
----------------------------------------------------------- */
const desktopLoading = computed(() => {
  // If you have a flag like scan.flags.screenshots, use that instead
  // For now: "loading" if neither image exists but scan is running
  const st = String(props.scan?.status || "").toLowerCase();
  const running = st.includes("running");
  return running && !desktopOldSrc.value && !desktopNewSrc.value;
});

const mobileLoading = computed(() => {
  const st = String(props.scan?.status || "").toLowerCase();
  const running = st.includes("running");
  return running && !mobileSrc.value;
});

/* -----------------------------------------------------------
   Desktop compare modal (reuse your MQC2 CompareModal)
----------------------------------------------------------- */
const compareOpen = ref(false);
const compareOld = ref(null);
const compareNew = ref(null);

function onCompare(payload) {
  compareOld.value = payload?.old || null;
  compareNew.value = payload?.new || null;
  compareOpen.value = true;
}

/* -----------------------------------------------------------
   Mobile modal
----------------------------------------------------------- */
const mobileOpen = ref(false);
function openMobile() {
  if (!mobileSrc.value) return;
  mobileOpen.value = true;
}
</script>

<template>
  <div>
    <!-- MQC1 Desktop Visual Comparison -->
    <Screenshots
  :loading="desktopLoading"
  :old-src="desktopOldSrc || ''"
  :new-src="desktopNewSrc || ''"
  :old-url="oldUrl || ''"
  :new-url="newUrl || ''"
  :pair="pair"
  @compare="onCompare"
/>


    <!-- MQC1 Mobile Frame + MQC2/MQC1 Mobile Modal -->
    <MobileFrame
        :src="mobileSrc || ''"
        :loading="mobileLoading"
        @open="openMobile"
    />

    <MobileModal
        :open="mobileOpen"
        :src="mobileSrc || ''"
        :loading="mobileLoading"
        @close="mobileOpen = false"
    />

    <!-- Desktop compare modal (side-by-side) -->
    <CompareModal
        :open="compareOpen"
        :src-old="compareOld"
        :src-new="compareNew"
        @close="compareOpen = false"
    />
  </div>
</template>
